import React from "react";
import { motion, useInView } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  CreditCard,
  Bot,
  TrendingUp,
  Shield,
  ArrowRight,
  Wallet,
  PieChart,
  Calendar,
} from "lucide-react";

/* ───────── Background ───────── */
function BackgroundFX() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_20%,rgba(16,185,129,0.14),transparent_50%),radial-gradient(ellipse_60%_50%_at_90%_80%,rgba(34,211,238,0.08),transparent_50%),linear-gradient(160deg,#060a14_0%,#0a0f1a_40%,#04140f_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,rgba(255,255,255,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.3)_1px,transparent_1px)] [background-size:80px_80px]" />
      <motion.div
        className="pointer-events-none fixed -left-40 top-[10%] h-[500px] w-[500px] rounded-full bg-emerald-500/[0.07] blur-[100px]"
        animate={{ y: [0, -30, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none fixed -right-32 bottom-[5%] h-[400px] w-[400px] rounded-full bg-cyan-500/[0.05] blur-[80px]"
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

/* ───────── Animated section wrapper ───────── */
function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ───────── Mini dashboard mockup ───────── */
function DashboardPreview() {
  return (
    <div className="relative">
      {/* Glow behind */}
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-emerald-500/[0.06] blur-2xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl shadow-2xl shadow-black/40">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-emerald-400/60" />
            <span className="text-xs font-medium text-white/50">Dashboard — Fev 2026</span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <div className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Receitas", value: "R$ 8.450", color: "text-emerald-400" },
            { label: "Gastos", value: "R$ 3.210", color: "text-orange-400" },
            { label: "Saldo", value: "R$ 5.240", color: "text-cyan-400" },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="text-[10px] text-white/40 uppercase tracking-wider">{kpi.label}</div>
              <div className={`mt-1 text-sm font-bold ${kpi.color}`}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Chart bars */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-3 text-[10px] text-white/40 uppercase tracking-wider">Gastos por categoria</div>
          <div className="flex items-end gap-2 h-20">
            {[65, 45, 80, 35, 55, 70, 40].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-emerald-500/40 to-emerald-400/20"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.8, delay: 0.6 + i * 0.08, ease: "easeOut" }}
              />
            ))}
          </div>
        </div>

        {/* Recent items */}
        <div className="mt-3 space-y-2">
          {[
            { icon: CreditCard, desc: "Nubank — Fatura", val: "-R$ 1.340" },
            { icon: Wallet, desc: "Salário recebido", val: "+R$ 5.200" },
          ].map((item) => (
            <div key={item.desc} className="flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.02] px-3 py-2">
              <item.icon className="h-3.5 w-3.5 text-white/30" />
              <span className="flex-1 text-xs text-white/50">{item.desc}</span>
              <span className={`text-xs font-semibold ${item.val.startsWith("+") ? "text-emerald-400" : "text-orange-400"}`}>
                {item.val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── Bento Feature ───────── */
function BentoCard({
  icon: Icon,
  title,
  description,
  className = "",
  delay = 0,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur transition-all duration-500 hover:border-emerald-500/20 hover:bg-white/[0.05]">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-500/[0.04] blur-2xl transition-all duration-700 group-hover:bg-emerald-500/[0.08]" />
        <div className="relative">
          <div className="mb-4 inline-flex rounded-xl bg-emerald-500/10 p-2.5 ring-1 ring-emerald-500/15">
            <Icon className="h-5 w-5 text-emerald-400" />
          </div>
          <h3 className="mb-1.5 text-base font-bold text-white/90">{title}</h3>
          <p className="text-sm leading-relaxed text-white/45">{description}</p>
        </div>
      </div>
    </Reveal>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-white selection:bg-emerald-500/30">
      <BackgroundFX />

      {/* ── Navbar ── */}
      <nav className="relative z-20 border-b border-white/[0.04]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/20">
              <span className="text-sm">🪙</span>
            </div>
            <span className="text-base font-bold tracking-tight">FinBrasil</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/50 hover:text-white hover:bg-white/5 text-sm"
              onClick={() => navigate("/auth?mode=login")}
            >
              Entrar
            </Button>
            <Button
              size="sm"
              className="rounded-lg bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400 text-sm"
              onClick={() => navigate("/auth?mode=signup")}
            >
              Começar grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero — asymmetric split ── */}
      <section className="relative z-10 py-20 md:py-28 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            {/* Left — copy */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-1 text-xs font-medium text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Gestão financeira inteligente
              </div>

              <h1 className="text-[2.5rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                Seu dinheiro.
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
                  Sua clareza.
                </span>
                <br />
                <span className="text-white/60">Seu controle.</span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-relaxed text-white/45 lg:text-lg">
                Organize gastos, cartões de crédito e investimentos em um painel inteligente feito para o brasileiro.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="group h-12 rounded-xl bg-emerald-500 px-7 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 hover:shadow-emerald-500/30 transition-all duration-300"
                    onClick={() => navigate("/auth?mode=signup")}
                  >
                    Criar conta grátis
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </motion.div>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 text-sm text-white/50 hover:text-white/80 hover:bg-white/5"
                  onClick={() => navigate("/auth?mode=login")}
                >
                  Já tenho conta
                </Button>
              </div>

              {/* Micro trust */}
              <div className="mt-10 flex flex-wrap gap-6 text-xs text-white/30">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500/50" /> Criptografia de ponta
                </span>
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-emerald-500/50" /> 100% gratuito
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-emerald-500/50" /> Sem cartão de crédito
                </span>
              </div>
            </motion.div>

            {/* Right — dashboard preview */}
            <motion.div
              initial={{ opacity: 0, y: 40, rotateY: -6 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block [perspective:1200px]"
            >
              <div className="[transform:rotateY(2deg)_rotateX(1deg)] transition-transform duration-700 hover:[transform:rotateY(0deg)_rotateX(0deg)]">
                <DashboardPreview />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features — Bento grid ── */}
      <section className="relative z-10 pb-28">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mb-10">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Feito para quem quer{" "}
                <span className="text-emerald-400">ver resultado.</span>
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/40">
                Cada funcionalidade é pensada para dar mais clareza sobre suas finanças pessoais.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Tall card */}
            <BentoCard
              icon={BarChart3}
              title="Dashboards inteligentes"
              description="Gráficos interativos que mostram exatamente para onde vai cada centavo. Visão diária, semanal e mensal."
              className="sm:row-span-2"
              delay={0}
            />
            <BentoCard
              icon={CreditCard}
              title="Cartões e faturas"
              description="Gerencie parcelas, faturas e limites de todos os seus cartões."
              delay={0.08}
            />
            <BentoCard
              icon={Bot}
              title="Assistente com IA"
              description="Análise inteligente dos seus padrões de gasto com sugestões práticas."
              delay={0.16}
            />
            <BentoCard
              icon={TrendingUp}
              title="Evolução mensal"
              description="Compare meses e veja seu progresso financeiro ao longo do tempo."
              delay={0.12}
            />
            <BentoCard
              icon={PieChart}
              title="Categorias detalhadas"
              description="Categorize automaticamente e entenda seus hábitos de consumo."
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ── Metrics / Social Proof ── */}
      <section className="relative z-10 pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { value: "12.400+", label: "Usuários ativos", suffix: "" },
                { value: "R$ 87M", label: "Já organizados", suffix: "" },
                { value: "4.8", label: "Nota média", suffix: "/ 5" },
                { value: "30s", label: "Para começar", suffix: "" },
              ].map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center backdrop-blur"
                >
                  <div className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    {m.value}
                    {m.suffix && <span className="text-base font-medium text-white/30 ml-1">{m.suffix}</span>}
                  </div>
                  <div className="mt-1.5 text-xs font-medium uppercase tracking-wider text-white/35">
                    {m.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="relative z-10 pb-28">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: Shield,
                  title: "Segurança real",
                  desc: "Criptografia de ponta a ponta. Seus dados financeiros ficam protegidos.",
                },
                {
                  icon: Wallet,
                  title: "Sem custos escondidos",
                  desc: "Todas as funcionalidades essenciais são gratuitas. Sem surpresas.",
                },
                {
                  icon: Calendar,
                  title: "Pronto em 30 segundos",
                  desc: "Crie sua conta e comece a organizar suas finanças imediatamente.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur"
                >
                  <item.icon className="mb-3 h-5 w-5 text-emerald-400/60" />
                  <h4 className="text-sm font-bold text-white/80">{item.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/35">{item.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 pb-24">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-cyan-500/[0.04] px-8 py-16 text-center backdrop-blur md:px-16">
              <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/[0.06] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-cyan-500/[0.04] blur-3xl" />

              <div className="relative">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Comece agora.{" "}
                  <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    É grátis.
                  </span>
                </h2>
                <p className="mx-auto mt-4 max-w-md text-sm text-white/40">
                  Leva menos de 30 segundos para criar sua conta e ter o controle das suas finanças na palma da mão.
                </p>
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="mt-8">
                  <Button
                    size="lg"
                    className="group h-12 rounded-xl bg-emerald-500 px-8 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 hover:shadow-emerald-500/30 transition-all duration-300"
                    onClick={() => navigate("/auth?mode=signup")}
                  >
                    Começar gratuitamente
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.04] py-8">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/15">
              <span className="text-xs">🪙</span>
            </div>
            <span className="text-sm font-semibold text-white/40">FinBrasil</span>
          </div>
          <span className="text-xs text-white/20">
            © {new Date().getFullYear()} FinBrasil. Todos os direitos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}
