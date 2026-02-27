import React from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BarChart3, CreditCard, Bot, TrendingUp, Shield, Zap, Globe } from "lucide-react";

/* ───────── Background ───────── */
function BackgroundFX() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_80%_30%,rgba(34,211,238,0.08),transparent_45%),linear-gradient(135deg,#0b1220_0%,#060a14_45%,#04140f_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:64px_64px]" />
      <motion.div
        className="pointer-events-none fixed left-[-120px] top-[20%] h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, 12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none fixed right-[-140px] top-[10%] h-[420px] w-[420px] rounded-full bg-cyan-500/8 blur-3xl"
        animate={{ y: [0, 24, 0], x: [0, -10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

/* ───────── Feature Card ───────── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/30 hover:bg-white/[0.07] hover:shadow-lg hover:shadow-emerald-500/5"
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-500/5 blur-2xl transition-all duration-500 group-hover:bg-emerald-500/10" />
      <div className="relative">
        <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-3 ring-1 ring-emerald-400/20">
          <Icon className="h-6 w-6 text-emerald-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-white/90">{title}</h3>
        <p className="text-sm leading-relaxed text-white/60">{description}</p>
      </div>
    </motion.div>
  );
}

/* ───────── Stat Badge ───────── */
function StatBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 backdrop-blur">
      <Icon className="h-4 w-4 text-emerald-400" />
      {text}
    </span>
  );
}

/* ───────── Landing Page ───────── */
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white">
      <BackgroundFX />

      {/* ── Navbar ── */}
      <nav className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/20">
              <span className="text-lg">🪙</span>
            </div>
            <span className="text-lg font-bold tracking-tight">FinBrasil</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-white/70 hover:text-white hover:bg-white/5"
              onClick={() => navigate("/auth?mode=login")}
            >
              Já tenho conta
            </Button>
            <Button
              className="rounded-xl bg-emerald-500 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 hover:shadow-emerald-500/30"
              onClick={() => navigate("/auth?mode=signup")}
            >
              Criar conta grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 pb-20 pt-16 md:pt-24">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Gestão financeira inteligente para brasileiros
            </div>

            <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              Tenha{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                controle total
              </span>{" "}
              do seu dinheiro em um só lugar.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-lg text-white/60 md:text-xl">
              Organize gastos, cartões e investimentos com inteligência e simplicidade.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                className="h-13 rounded-xl bg-emerald-500 px-8 text-base font-bold text-slate-950 shadow-xl shadow-emerald-500/25 hover:bg-emerald-400 hover:shadow-emerald-500/35 transition-all duration-300"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Criar conta grátis
              </Button>
            </motion.div>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                variant="outline"
                className="h-13 rounded-xl border-white/15 bg-white/5 px-8 text-base text-white/80 hover:bg-white/10 hover:text-white backdrop-blur"
                onClick={() => navigate("/auth?mode=login")}
              >
                Já tenho conta
              </Button>
            </motion.div>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-3"
          >
            <StatBadge icon={Shield} text="Dados protegidos" />
            <StatBadge icon={Globe} text="Feito para o Brasil" />
            <StatBadge icon={Zap} text="100% gratuito" />
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative z-10 pb-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Tudo que você precisa para{" "}
              <span className="text-emerald-400">organizar suas finanças</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/50">
              Funcionalidades pensadas para quem quer sair do caos financeiro e entrar no controle.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={BarChart3}
              title="Gráficos inteligentes"
              description="Visualize para onde vai cada centavo com dashboards claros e interativos."
              delay={0}
            />
            <FeatureCard
              icon={CreditCard}
              title="Cartões e faturas"
              description="Gerencie todos os seus cartões, parcelas e faturas em um único lugar."
              delay={0.1}
            />
            <FeatureCard
              icon={Bot}
              title="Assistente financeiro"
              description="IA que analisa seus padrões e sugere melhorias para seu orçamento."
              delay={0.2}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Evolução mensal"
              description="Acompanhe seu progresso financeiro mês a mês com relatórios automáticos."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ── Trust / Security ── */}
      <section className="relative z-10 pb-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-xl"
          >
            <div className="mx-auto mb-5 inline-flex rounded-2xl bg-emerald-500/10 p-4 ring-1 ring-emerald-400/20">
              <Shield className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold">Seus dados protegidos com segurança</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/50">
              Utilizamos criptografia de ponta e infraestrutura segura para que suas informações
              financeiras estejam sempre protegidas. Seus dados são seus — e de mais ninguém.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 pb-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Pronto para assumir o{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                controle?
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-white/50">
              Comece agora mesmo, sem custos. Leva menos de 30 segundos.
            </p>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="mt-8">
              <Button
                size="lg"
                className="h-13 rounded-xl bg-emerald-500 px-10 text-base font-bold text-slate-950 shadow-xl shadow-emerald-500/25 hover:bg-emerald-400 hover:shadow-emerald-500/35 transition-all duration-300"
                onClick={() => navigate("/auth?mode=signup")}
              >
                Começar gratuitamente
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-white/30">
          © {new Date().getFullYear()} FinBrasil. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
