import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageSquare, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function WhatsAppSettings({ userId }: { userId: string }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [linkedPhone, setLinkedPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Check existing link on mount
  useEffect(() => {
    async function check() {
      const { data } = await supabase
        .from("whatsapp_users")
        .select("phone_number, verified")
        .eq("user_id", userId)
        .maybeSingle();

      if (data?.verified) {
        setIsLinked(true);
        setLinkedPhone(data.phone_number);
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

  const handleLinkWhatsApp = async () => {
    const clean = phoneNumber.replace(/\D/g, "");
    if (clean.length !== 11) {
      toast.error("Digite um número válido com DDD (11 dígitos)");
      return;
    }

    setLoading(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const fullPhone = "+55" + clean;

      const { error } = await supabase
        .from("whatsapp_users")
        .upsert({
          user_id: userId,
          phone_number: fullPhone,
          verification_code: code,
          verified: false,
        }, { onConflict: "user_id" });

      if (error) throw error;

      const { error: sendError } = await supabase.functions.invoke("whatsapp-webhook", {
        body: { action: "send_verification", phone: fullPhone, code },
      });

      if (sendError) throw sendError;

      toast.success("Código enviado! Verifique seu WhatsApp");
      setIsVerifying(true);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao enviar código");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
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

      if (error) throw error;

      if (data.verification_code !== verificationCode) {
        toast.error("Código inválido");
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
      console.error(error);
      toast.error(error?.message || "Erro ao verificar código");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm("Deseja desvincular seu WhatsApp?")) return;
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
      console.error(error);
      toast.error("Erro ao desvincular");
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

      {!isLinked && !isVerifying && (
        <div className="space-y-3">
          <Input
            placeholder="(11) 99999-9999"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
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
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            className="h-11 rounded-xl text-center text-lg tracking-widest"
          />
          <div className="flex gap-2">
            <Button onClick={handleVerifyCode} disabled={loading} className="flex-1 h-10 rounded-xl gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Check className="h-4 w-4" />
              Verificar
            </Button>
            <Button variant="outline" onClick={() => setIsVerifying(false)} disabled={loading} className="h-10 rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>
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
