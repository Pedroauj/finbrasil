import React, { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable/index";

const Auth = () => {
  const { signIn, signUp } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <BackgroundFX />

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
        <div className="grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-2">
          {/* Lado esquerdo (desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 backdrop-blur">
              <span className="text-emerald-300">●</span>
              Gestão financeira simples, completa e brasileira
            </div>

            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
              <span className="text-white/90">FinBrasil</span>{" "}
              <span className="text-emerald-300">— Controle total</span>
              <br />
              do seu dinheiro em um só lugar.
            </h1>

            <p className="mt-4 max-w-lg text-base text-white/70">
              Controle cartões, recorrências e planejamento mensal com clareza. Um visual moderno pra você entender seu
              dinheiro de verdade.
            </p>

            <div className="mt-6 grid max-w-lg gap-3">
              <Feature title="Cartões + faturas organizadas" desc="Veja o impacto real de cada gasto no mês." />
              <Feature
                title="Recorrências e calendário financeiro"
                desc="Contas fixas e datas importantes sempre no radar."
              />
              <Feature
                title="Planejamento mensal inteligente"
                desc="Visualize limites, sobra do mês e metas com consistência."
              />
            </div>

            <div className="mt-8 flex items-center gap-3 text-sm text-white/60">
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                🔒 Dados protegidos
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                🇧🇷 Feito para o Brasil
              </span>
              <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
                📊 Clareza total
              </span>
            </div>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05 }}
            className="mx-auto w-full max-w-md"
          >
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-500/10 backdrop-blur-xl">
              {/* Glow */}
              <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-transparent to-cyan-500/10 blur-xl" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/20">
                    <span className="text-xl">🪙</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight">FinBrasil — Gestão Financeira</h2>
                    <p className="text-sm text-white/60">{isLogin ? "Entre na sua conta" : "Crie sua conta"}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-white/70">
                        Nome
                      </Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Seu nome"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={100}
                        className="h-11 rounded-xl border-white/10 bg-slate-950/40 text-white placeholder:text-white/40 focus-visible:ring-emerald-500/20"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/70">
                      E-mail
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={255}
                      className="h-11 rounded-xl border-white/10 bg-slate-950/40 text-white placeholder:text-white/40 focus-visible:ring-emerald-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/70">
                      Senha
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      maxLength={128}
                      className="h-11 rounded-xl border-white/10 bg-slate-950/40 text-white placeholder:text-white/40 focus-visible:ring-emerald-500/20"
                    />
                  </div>

                  <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      className="h-11 w-full rounded-xl bg-emerald-500 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
                      disabled={loading}
                    >
                      {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
                    </Button>
                  </motion.div>
                </form>

                {/* Divider */}
                <div className="mt-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-white/40">ou</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                {/* Apple Sign In */}
                <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }} className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full rounded-xl border-white/10 bg-white text-black font-semibold hover:bg-white/90 hover:text-black"
                    disabled={oauthLoading || loading}
                    onClick={async () => {
                      setOauthLoading(true);
                      try {
                        const { error } = await lovable.auth.signInWithOAuth("apple", {
                          redirect_uri: window.location.origin,
                        });
                        if (error) toast.error(error.message);
                      } finally {
                        setOauthLoading(false);
                      }
                    }}
                  >
                    <svg className="h-5 w-5 mr-1" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    {oauthLoading ? "Aguarde..." : "Continuar com Apple"}
                  </Button>
                </motion.div>

                <div className="mt-4 text-center text-sm text-white/60">
                  {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
                  <button
                    className="font-semibold text-emerald-300 underline-offset-4 hover:underline"
                    onClick={() => setIsLogin(!isLogin)}
                    type="button"
                  >
                    {isLogin ? "Cadastre-se" : "Faça login"}
                  </button>
                </div>

                <div className="pt-4 text-center text-xs text-white/45">
                  🔒 Seus dados são criptografados e protegidos.
                </div>
              </div>
            </div>

            {/* Mobile: mini proposta */}
            <div className="mt-6 space-y-3 lg:hidden">
              <MiniValue />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/20">
          <span className="text-emerald-200">✓</span>
        </div>
        <div>
          <div className="text-sm font-semibold text-white/90">{title}</div>
          <div className="mt-1 text-sm text-white/60">{desc}</div>
        </div>
      </div>
    </div>
  );
}

function MiniValue() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70 backdrop-blur">
      <div className="font-semibold text-white/90">Por que usar o FinBrasil?</div>
      <ul className="mt-2 space-y-1">
        <li>• Cartões e faturas organizadas</li>
        <li>• Recorrências e calendário financeiro</li>
        <li>• Planejamento mensal inteligente</li>
      </ul>
    </div>
  );
}

function BackgroundFX() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.10),transparent_45%),linear-gradient(135deg,#0b1220_0%,#060a14_45%,#04140f_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:64px_64px]" />

      <motion.div
        className="pointer-events-none absolute left-[-120px] top-[20%] h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute right-[-140px] top-[10%] h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-3xl"
        animate={{ y: [0, 24, 0], x: [0, -10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[-160px] left-[15%] h-[440px] w-[440px] rounded-full bg-emerald-500/8 blur-3xl"
        animate={{ y: [0, 18, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

export default Auth;
