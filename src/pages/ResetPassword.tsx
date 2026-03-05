import React, { useState, useEffect } from "react";
import { FinBrasilLogo } from "@/components/FinBrasilLogo";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success("Senha atualizada com sucesso!");
        setTimeout(() => navigate("/app"), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.08),transparent_45%),linear-gradient(135deg,#0b1220_0%,#060a14_45%,#04140f_100%)]" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <button
            onClick={() => navigate("/auth")}
            className="flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </button>
          <div className="flex items-center gap-2.5">
            <FinBrasilLogo height={30} />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto w-full max-w-md"
          >
            <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl">
              <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/5 blur-xl" />

              <div className="relative">
                {success ? (
                  <div className="flex flex-col items-center gap-4 py-6 text-center">
                    <CheckCircle className="h-12 w-12 text-emerald-400" />
                    <h2 className="text-xl font-bold">Senha atualizada!</h2>
                    <p className="text-sm text-white/50">Redirecionando...</p>
                  </div>
                ) : (
                  <>
                    <h2 className="mb-2 text-xl font-bold">Nova senha</h2>
                    <p className="mb-6 text-sm text-white/50">
                      {isRecovery
                        ? "Digite sua nova senha abaixo."
                        : "Aguardando verificação do link de recuperação..."}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-white/60 text-xs font-medium">
                          Nova senha
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          maxLength={128}
                          className="h-11 rounded-xl border-white/10 bg-slate-950/40 text-white placeholder:text-white/30 focus-visible:ring-emerald-500/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-white/60 text-xs font-medium">
                          Confirmar senha
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Repita a senha"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={6}
                          maxLength={128}
                          className="h-11 rounded-xl border-white/10 bg-slate-950/40 text-white placeholder:text-white/30 focus-visible:ring-emerald-500/20"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="h-12 w-full rounded-xl bg-emerald-500 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all duration-300"
                        disabled={loading || !isRecovery}
                      >
                        {loading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          "Redefinir senha"
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
