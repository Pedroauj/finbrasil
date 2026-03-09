import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageSquare, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function WhatsAppSettings({ userId }: { userId: string }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  const handleLinkWhatsApp = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length !== 11) {
      toast.error("Digite um número válido com DDD");
      return;
    }

    setLoading(true);
    try {
      // Gerar código de verificação
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Salvar no banco
      const cleanPhone = "+55" + phoneNumber.replace(/\D/g, "");
      const { error } = await supabase
        .from("whatsapp_users")
        .upsert({
          user_id: userId,
          phone_number: cleanPhone,
          verification_code: code,
          verified: false,
        });

      if (error) throw error;

      // Enviar código via WhatsApp
      const { error: sendError } = await supabase.functions.invoke("whatsapp-webhook", {
        body: {
          action: "send_verification",
          phone: cleanPhone,
          code,
        },
      });

      if (sendError) throw sendError;

      toast.success("Código enviado! Verifique seu WhatsApp");
      setIsVerifying(true);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar código");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Digite o código de 6 dígitos");
      return;
    }

    setLoading(true);
    try {
      const cleanPhone = "+55" + phoneNumber.replace(/\D/g, "");
      
      // Verificar código
      const { data, error } = await supabase
        .from("whatsapp_users")
        .select("verification_code")
        .eq("user_id", userId)
        .eq("phone_number", cleanPhone)
        .single();

      if (error) throw error;

      if (data.verification_code !== verificationCode) {
        toast.error("Código inválido");
        return;
      }

      // Marcar como verificado
      const { error: updateError } = await supabase
        .from("whatsapp_users")
        .update({ verified: true, verification_code: null })
        .eq("user_id", userId)
        .eq("phone_number", cleanPhone);

      if (updateError) throw updateError;

      toast.success("WhatsApp vinculado com sucesso!");
      setIsLinked(true);
      setIsVerifying(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao verificar código");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("whatsapp_users")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("WhatsApp desvinculado");
      setIsLinked(false);
      setPhoneNumber("");
      setVerificationCode("");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao desvincular");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Integração WhatsApp</h3>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Vincule seu WhatsApp para registrar gastos e receitas por mensagem
      </p>

      {!isLinked && !isVerifying && (
        <div className="space-y-3">
          <Input
            placeholder="(11) 99999-9999"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
            maxLength={15}
          />
          <Button onClick={handleLinkWhatsApp} disabled={loading} className="w-full">
            Vincular WhatsApp
          </Button>
        </div>
      )}

      {isVerifying && (
        <div className="space-y-3">
          <p className="text-sm">Digite o código enviado para {phoneNumber}</p>
          <Input
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
          />
          <div className="flex gap-2">
            <Button onClick={handleVerifyCode} disabled={loading} className="flex-1">
              <Check className="w-4 h-4 mr-2" />
              Verificar
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsVerifying(false)}
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {isLinked && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-600">
            <Check className="w-4 h-4" />
            Vinculado: {phoneNumber}
          </div>
          <Button variant="destructive" onClick={handleUnlink} disabled={loading} className="w-full">
            Desvincular
          </Button>
        </div>
      )}
    </Card>
  );
}
