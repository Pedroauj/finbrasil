import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";
import { ArrowLeft, Loader2 } from "lucide-react";

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") setIsLogin(false);
    else if (mode === "login") setIsLogin(true);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) toast.error(error.message);
    } finally {
      setOauthLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <BackgroundFX />

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Top bar */}
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <button
            onClick={() => navigate("/landing")}
            className="flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/20">
              <span className="text-base">🪙</span>
            </div>
            <span className="font-bold tracking-tight">FinBrasil</span>
          </div>
        </div>

        {/* Center content */}
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-2">
            {/* Left side — impact phrase (desktop) */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="hidden lg:block"
            >
              <h1 className="text-4xl font-bold leading-tight tracking-tight">
                {isLogin ? (
                  <>
                    Bom te ver
                    <br />
                    <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      de volta.
                    </span>
                  </>
                ) : (
                  <>
                    Comece sua jornada
                    <br />
                    <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      financeira hoje.
                    </span>
                  </>
                )}
              </h1>
              <p className="mt-4 max-w-sm text-white/50">
                {isLogin
                  ? "Acesse sua conta e continue organizando suas finanças com inteligência."
                  : "Crie sua conta em segundos e tenha controle total do seu dinheiro — sem custos."}
              </p>

              <div className="mt-8 space-y-3">
                <TrustItem text="Dados criptografados e protegidos" />
                <TrustItem text="100% gratuito, sem cartão de crédito" />
                <TrustItem text="Pronto para usar em 30 segundos" />
              </div>
            </motion.div>

            {/* Right side — Auth card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mx-auto w-full max-w-md"
            >
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-emerald-500/5 backdrop-blur-xl">
                {/* Glow */}
                <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-transparent to-cyan-500/5 blur-xl" />

                <div className="relative">
                  {/* Tab switcher */}
                  <div className="mb-6 flex rounded-xl bg-white/5 p-1">
                    <TabButton active={!isLogin} onClick={() => setIsLogin(false)}>
                      Criar conta
                    </TabButton>
                    <TabButton active={isLogin} onClick={() => setIsLogin(true)}>
                      Entrar
                    </TabButton>
                  </div>

                  {/* OAuth buttons */}
                  <div className="space-y-3">
                    <OAuthButton
                      provider="google"
                      loading={oauthLoading === "google"}
                      disabled={loading || !!oauthLoading}
                      onClick={() => handleOAuth("google")}
                    />
                    <OAuthButton
                      provider="apple"
                      loading={oauthLoading === "apple"}
                      disabled={loading || !!oauthLoading}
                      onClick={() => handleOAuth("apple")}
                    />
                  </div>

                  {/* Divider */}
                  <div className="my-5 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-xs text-white/30">ou com e-mail</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  {/* Form */}
                  <AnimatePresence mode="wait">
                    <motion.form
                      key={isLogin ? "login" : "signup"}
                      initial={{ opacity: 0, x: isLogin ? -12 : 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isLogin ? 12 : -12 }}
                      transition={{ duration: 0.25 }}
                      onSubmit={handleSubmit}
                      className="space-y-4"
                    >
                      {!isLogin && (
                        <Field label="Nome" id="name">
                          <Input
                            id="name"
                            type="text"
                            placeholder="Seu nome"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            maxLength={100}
                            className="h-11 rounded-xl border-white/10 bg-slate-950/40 text-white placeholder:text-white/30 focus-visible:ring-emerald-500/20"
                          />
                        </Field>
                      )}

                      <Field label="E-mail" id="email">
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          maxLength={255}
                          className="h-11 rounded-xl border-white/10 bg-slate-950/40 text-white placeholder:text-white/30 focus-visible:ring-emerald-500/20"
                        />
                      </Field>

                      <Field label="Senha" id="password">
                        <Input
                          id="password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          maxLength={128}
                          className="h-11 rounded-xl border-white/10 bg-slate-950/40 text-white placeholder:text-white/30 focus-visible:ring-emerald-500/20"
                        />
                      </Field>

                      <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          className="h-12 w-full rounded-xl bg-emerald-500 text-base font-bold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-all duration-300"
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : isLogin ? (
                            "Entrar"
                          ) : (
                            "Começar gratuitamente"
                          )}
                        </Button>
                      </motion.div>
                    </motion.form>
                  </AnimatePresence>

                  <div className="mt-5 text-center text-xs text-white/35">
                    🔒 Seus dados são criptografados e protegidos.
                  </div>
                </div>
              </div>

              {/* Mobile value prop */}
              <div className="mt-6 space-y-2 lg:hidden">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 backdrop-blur">
                  <div className="font-semibold text-white/80">Por que usar o FinBrasil?</div>
                  <ul className="mt-2 space-y-1">
                    <li>• Controle total de gastos e cartões</li>
                    <li>• Assistente financeiro inteligente</li>
                    <li>• 100% gratuito</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sub-components ── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-emerald-500/15 text-emerald-300 shadow-sm"
          : "text-white/50 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

function OAuthButton({
  provider,
  loading,
  disabled,
  onClick,
}: {
  provider: "google" | "apple";
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-xl border-white/10 bg-white/[0.06] font-semibold text-white/80 hover:bg-white/10 hover:text-white backdrop-blur transition-all"
        disabled={disabled}
        onClick={onClick}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : provider === "google" ? (
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
        ) : (
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        )}
        {loading
          ? "Aguarde..."
          : provider === "google"
            ? "Continuar com Google"
            : "Continuar com Apple"}
      </Button>
    </motion.div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white/60 text-xs font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-white/50">
      <div className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500/10">
        <span className="text-emerald-400 text-xs">✓</span>
      </div>
      {text}
    </div>
  );
}

function BackgroundFX() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.08),transparent_45%),linear-gradient(135deg,#0b1220_0%,#060a14_45%,#04140f_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:64px_64px]" />
      <motion.div
        className="pointer-events-none absolute left-[-120px] top-[20%] h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-[-140px] top-[10%] h-[420px] w-[420px] rounded-full bg-cyan-500/8 blur-3xl"
        animate={{ y: [0, 24, 0], x: [0, -10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

export default Auth;
