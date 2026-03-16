import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageSquare, Check, X, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ErrorType = "network" | "duplicate_phone" | "twilio" | "db" | "unknown";

function classifyError(error: any): { type: ErrorType; message: string } {
  const msg = (error?.message || error?.toString() || "").toLowerCase();
  const code = error?.code || "";

  if (msg.includes("fetch") || msg.includes("networkerror") || msg.includes("failed to fetch")) {
    return { type: "network", message: "Sem conexão com a internet. Verifique sua rede e tente novamente." };
  }
  if (code === "23505" || msg.includes("duplicate") || msg.includes("unique") || msg.includes("already exists")) {
    return { type: "duplicate_phone", message: "Este número já está vinculado a outra conta. Use um número diferente." };
  }
  if (msg.includes("twilio") || msg.includes("whatsapp message") || msg.includes("failed to send")) {
    return { type: "twilio", message: "Não foi possível enviar a mensagem via WhatsApp. Verifique se o número está correto e tente novamente." };
  }
  if (code?.startsWith("P") || msg.includes("violates") || msg.includes("relation") || msg.includes("column")) {
    return { type: "db", message: "Erro interno ao salvar seus dados. Tente novamente em instantes." };
  }
  return { type: "unknown", message: "Algo deu errado. Tente novamente ou entre em contato com o suporte." };
}

export function WhatsAppSettings({ userId }: { userId: string }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [linkedPhone, setLinkedPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [errorInfo, setErrorInfo] = useState<{ type: ErrorType; message: string } | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  useEffect(() => {
    async function check() {
      try {
        const { data } = await supabase
          .from("whatsapp_users")
          .select("phone_number, verified")
          .eq("user_id", userId)
          .maybeSingle();

        if (data?.verified) {
          setIsLinked(true);
          setLinkedPhone(data.phone_number);
        }
      } catch (err) {
        console.error("Erro ao verificar vínculo:", err);
      }
      setInitialLoading(false);
    }
    check();
  }, [userId]);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const clearError = () => setErrorInfo(null);

  const handleLinkWhatsApp = async () => {
    clearError();
    const clean = phoneNumber.replace(/\D/g, "");

    if (clean.length === 0) {
      setErrorInfo({ type: "unknown", message: "Digite seu número de telefone com DDD." });
      return;
    }
    if (clean.length !== 11) {
      setErrorInfo({ type: "unknown", message: "O número deve ter 11 dígitos (DDD + número). Ex: (11) 99999-9999" });
      return;
    }
    if (!clean.match(/^[1-9]{2}9\d{8}$/)) {
      setErrorInfo({ type: "unknown", message: "Formato inválido. O número deve começar com DDD válido seguido de 9. Ex: (11) 99999-9999" });
      return;
    }

    setLoading(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const fullPhone = "+55" + clean;

      // Delete existing record first to avoid unique constraint conflicts
      await supabase
        .from("whatsapp_users")
        .delete()
        .eq("user_id", userId);

      const { error } = await supabase
        .from("whatsapp_users")
        .insert({
          user_id: userId,
          phone_number: fullPhone,
          verification_code: code,
          verified: false,
        });

      if (error) throw error;

      const { error: sendError } = await supabase.functions.invoke("whatsapp-webhook", {
        body: { action: "send_verification", phone: fullPhone, code },
      });

      if (sendError) throw sendError;

      toast.success("Código enviado! Verifique seu WhatsApp");
      setIsVerifying(true);
      setAttemptsLeft(3);
    } catch (error: any) {
      console.error("Erro ao vincular WhatsApp:", error);
      const classified = classifyError(error);
      setErrorInfo(classified);
      toast.error(classified.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    clearError();

    if (verificationCode.length !== 6) {
      setErrorInfo({ type: "unknown", message: "O código deve ter exatamente 6 dígitos." });
      return;
    }

    if (attemptsLeft <= 0) {
      setErrorInfo({ type: "unknown", message: "Tentativas esgotadas. Solicite um novo código." });
      return;
    }

    setLoading(true);
    try {
      const fullPhone = "+55" + phoneNumber.replace(/\D/g, "");

      const { data, error } = await supabase
        .from("whatsapp_users")
        .select("verification_code")
        .eq("user_id", userId)
        .eq("phone_number", fullPhone)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setErrorInfo({ type: "db", message: "Registro não encontrado. Solicite um novo código de verificação." });
          return;
        }
        throw error;
      }

      if (data.verification_code !== verificationCode) {
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);
        setErrorInfo({
          type: "unknown",
          message: remaining > 0
            ? `Código incorreto. Você tem ${remaining} tentativa${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
            : "Tentativas esgotadas. Solicite um novo código.",
        });
        return;
      }

      const { error: updateError } = await supabase
        .from("whatsapp_users")
        .update({ verified: true, verification_code: null })
        .eq("user_id", userId)
        .eq("phone_number", fullPhone);

      if (updateError) throw updateError;

      toast.success("WhatsApp vinculado com sucesso! 🎉");
      setIsLinked(true);
      setLinkedPhone(fullPhone);
      setIsVerifying(false);
    } catch (error: any) {
      console.error("Erro ao verificar código:", error);
      const classified = classifyError(error);
      setErrorInfo(classified);
      toast.error(classified.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsVerifying(false);
    setVerificationCode("");
    clearError();
    await handleLinkWhatsApp();
  };

  const handleUnlink = async () => {
    if (!confirm("Deseja desvincular seu WhatsApp?")) return;
    clearError();
    setLoading(true);
    try {
      const { error } = await supabase
        .from("whatsapp_users")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("WhatsApp desvinculado");
      setIsLinked(false);
      setLinkedPhone("");
      setPhoneNumber("");
      setVerificationCode("");
    } catch (error: any) {
      console.error("Erro ao desvincular:", error);
      const classified = classifyError(error);
      setErrorInfo(classified);
      toast.error(classified.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDisplay = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("55") && digits.length === 13) {
      const local = digits.slice(2);
      return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
    }
    return phone;
  };

  if (initialLoading) {
    return (
      <Card className="rounded-3xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="rounded-xl bg-primary/10 p-2">
          <MessageSquare className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-base font-semibold">WhatsApp</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Vincule seu WhatsApp para registrar gastos e receitas enviando mensagens como "gastei 50 no almoço"
      </p>

      {/* Error banner */}
      {errorInfo && (
        <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-destructive font-medium">{errorInfo.message}</p>
            {errorInfo.type === "network" && (
              <p className="text-[11px] text-destructive/70 mt-1">Verifique sua conexão Wi-Fi ou dados móveis.</p>
            )}
            {errorInfo.type === "duplicate_phone" && (
              <p className="text-[11px] text-destructive/70 mt-1">Cada número pode ser vinculado a apenas uma conta.</p>
            )}
          </div>
          <button onClick={clearError} className="text-destructive/50 hover:text-destructive transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!isLinked && !isVerifying && (
        <div className="space-y-3">
          <Input
            placeholder="(11) 99999-9999"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(formatPhoneNumber(e.target.value));
              clearError();
            }}
            maxLength={15}
            className="h-11 rounded-xl"
          />
          <Button onClick={handleLinkWhatsApp} disabled={loading} className="w-full h-10 rounded-xl gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            <MessageSquare className="h-4 w-4" />
            Vincular WhatsApp
          </Button>
        </div>
      )}

      {isVerifying && (
        <div className="space-y-3">
          <p className="text-sm">Código enviado para <span className="font-medium">{phoneNumber}</span></p>
          <Input
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => {
              setVerificationCode(e.target.value.replace(/\D/g, ""));
              clearError();
            }}
            maxLength={6}
            className="h-11 rounded-xl text-center text-lg tracking-widest"
          />
          {attemptsLeft < 3 && attemptsLeft > 0 && (
            <p className="text-[11px] text-muted-foreground text-center">
              {attemptsLeft} tentativa{attemptsLeft > 1 ? "s" : ""} restante{attemptsLeft > 1 ? "s" : ""}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleVerifyCode} disabled={loading || attemptsLeft <= 0} className="flex-1 h-10 rounded-xl gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Check className="h-4 w-4" />
              Verificar
            </Button>
            <Button variant="outline" onClick={() => { setIsVerifying(false); clearError(); }} disabled={loading} className="h-10 rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="ghost" onClick={handleResendCode} disabled={loading} className="w-full h-9 rounded-xl gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
            Reenviar código
          </Button>
        </div>
      )}

      {isLinked && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-primary/5 p-3">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Vinculado: {formatDisplay(linkedPhone)}</span>
          </div>
          <Button variant="outline" onClick={handleUnlink} disabled={loading} className="w-full h-10 rounded-xl gap-2 text-destructive hover:text-destructive">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Desvincular
          </Button>
        </div>
      )}
    </Card>
  );
}
