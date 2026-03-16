import React, { useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { InteractiveDemoWidget } from "@/components/InteractiveDemoWidget";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import {
  BarChart3,
  CreditCard,
  Bot,
  TrendingUp,
  Shield,
  ArrowRight,
  Wallet,
  Calendar,
  Star,
  Lock,
  Zap,
  MessageSquare,
  Check,
  Sparkles,
  Crown,
  ChevronDown,
  Target,
  FileSpreadsheet,
  Bell,
  Search,
  Mail,
  Users,
  RefreshCw,
  PiggyBank,
  Activity,
  Trophy,
  Layers,
  ArrowLeftRight,
} from "lucide-react";

/* ───────── Background ───────── */
function BackgroundFX() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 bg-background" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_20%,hsl(var(--primary)/0.10),transparent_50%),radial-gradient(ellipse_60%_50%_at_90%_80%,hsl(var(--ring)/0.06),transparent_50%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] dark:opacity-[0.04] [background-image:linear-gradient(to_right,hsl(var(--border)/0.4)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.4)_1px,transparent_1px)] [background-size:80px_80px]" />
      <motion.div
        className="pointer-events-none fixed -left-40 top-[10%] h-[500px] w-[500px] rounded-full bg-primary/[0.06] blur-[100px]"
        animate={{ y: [0, -30, 0], scale: [1, 1.05, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none fixed -right-32 bottom-[5%] h-[400px] w-[400px] rounded-full bg-ring/[0.04] blur-[80px]"
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

/* ───────── AI Chat Mockup ───────── */
function AIChatPreview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-primary/[0.04] blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/80 p-5 backdrop-blur-xl shadow-premium">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
            <Bot className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Assistente FinBrasil</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-end">
            <div className="rounded-2xl rounded-tr-md bg-primary/10 border border-primary/10 px-4 py-2.5 max-w-[80%]">
              <p className="text-xs text-foreground/70">Como estão meus gastos com alimentação?</p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex"
          >
            <div className="rounded-2xl rounded-tl-md bg-muted/60 border border-border px-4 py-2.5 max-w-[85%]">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você gastou <span className="text-primary font-semibold">18% acima da média</span> em alimentação este mês.
                Considere revisar pedidos por delivery — eles representam 62% dessa categoria.
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.9, duration: 0.5 }}
            className="flex"
          >
            <div className="rounded-2xl rounded-tl-md bg-muted/60 border border-border px-4 py-2.5 max-w-[85%]">
              <p className="text-xs text-muted-foreground leading-relaxed">
                💡 Se reduzir delivery em 30%, você economiza <span className="text-primary font-semibold">~R$ 180/mês</span>.
              </p>
            </div>
          </motion.div>
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
      <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card/80 p-6 backdrop-blur transition-all duration-500 hover:border-primary/25 hover:bg-card shadow-premium hover:glow-primary">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/[0.04] blur-2xl transition-all duration-700 group-hover:bg-primary/[0.08]" />
        <div className="relative">
          <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-2.5 ring-1 ring-primary/15">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="mb-1.5 text-base font-bold text-foreground">{title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
    </Reveal>
  );
}

/* ───────── Testimonial Card ───────── */
function TestimonialCard({
  name,
  role,
  text,
  delay = 0,
}: {
  name: string;
  role: string;
  text: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <div className="rounded-2xl border border-border bg-card/80 p-5 backdrop-blur shadow-premium">
        <div className="flex gap-0.5 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
          ))}
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground mb-4">"{text}"</p>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 ring-1 ring-primary/15 grid place-items-center">
            <span className="text-xs font-bold text-primary">{name[0]}</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-foreground/80">{name}</div>
            <div className="text-[11px] text-muted-foreground">{role}</div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ───────── FAQ ───────── */
const FAQ_ITEMS = [
  {
    q: "O FinBrasil é realmente gratuito?",
    a: "Sim! O plano Essencial é totalmente gratuito e inclui controle de despesas, receitas, dashboard financeiro, calendário e pesquisa global. Você pode usar sem limite de tempo."
  },
  {
    q: "Meus dados financeiros estão seguros?",
    a: "Absolutamente. Usamos criptografia de ponta a ponta e seus dados ficam armazenados em servidores seguros. Nunca compartilhamos informações com terceiros."
  },
  {
    q: "Como funciona a IA do assistente financeiro?",
    a: "O assistente analisa seus padrões de gasto e receita para oferecer insights personalizados, identificar gastos fora do normal e sugerir formas de economizar. Disponível nos planos Inteligente e Elite."
  },
  {
    q: "Posso importar meu extrato do banco?",
    a: "Sim! Você pode importar extratos em formato CSV. O sistema detecta automaticamente as colunas e categoriza as despesas usando inteligência artificial."
  },
  {
    q: "O que é o Snapshot Semanal?",
    a: "Todo segunda-feira você recebe um resumo automático das suas finanças por e-mail ou WhatsApp, incluindo gastos da semana, orçamento restante e contas a vencer. Basta ativar em Ajustes → Notificações."
  },
  {
    q: "Como funciona o Modo Família?",
    a: "Você cria um grupo familiar e convida membros por código. Cada membro pode visualizar ou editar as finanças compartilhadas, com permissões configuráveis."
  },
  {
    q: "O que é o FinScore?",
    a: "É uma pontuação de 0 a 1000 que mede sua saúde financeira com base em hábitos como pagar em dia, manter orçamento e alcançar metas. Quanto maior, melhor sua disciplina financeira."
  },
  {
    q: "Posso usar no celular?",
    a: "Sim! O FinBrasil é totalmente responsivo e funciona perfeitamente em smartphones, tablets e desktops. Também pode ser instalado como PWA."
  },
  {
    q: "Posso cancelar meu plano a qualquer momento?",
    a: "Sim, sem multas ou taxas. Você pode fazer downgrade para o plano gratuito quando quiser e continua tendo acesso às funcionalidades básicas."
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  return (
    <section className="relative z-10 pb-28">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Perguntas <span className="text-primary">frequentes</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tudo que você precisa saber antes de começar.
            </p>
          </div>
        </Reveal>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <Reveal key={i} delay={i * 0.05}>
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full text-left rounded-2xl border border-border bg-card/80 p-5 backdrop-blur transition-all hover:border-primary/20 hover:bg-card shadow-soft"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-foreground/80">{item.q}</span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    </motion.div>
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground pr-8">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   LANDING PAGE
   ═══════════════════════════════════════════ */
export default function Landing() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/app", { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-primary/30">
      <BackgroundFX />

      {/* ── Navbar ── */}
      <header className="relative z-20 border-b border-border/50" role="banner">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4" aria-label="Navegação principal">
          <a href="/" className="flex items-center gap-2.5" aria-label="FinBrasil — Página inicial">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
              <span className="text-sm" role="img" aria-label="Moeda">🪙</span>
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">FinBrasil</span>
          </a>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground text-sm"
              onClick={() => navigate("/auth?mode=login")}
            >
              Entrar
            </Button>
            <Button
              size="sm"
              className="rounded-lg text-sm font-semibold"
              onClick={() => navigate("/auth?mode=signup")}
            >
              Começar grátis
            </Button>
          </div>
        </nav>
      </header>

      <main>

      {/* ── Hero — asymmetric split ── */}
      <section className="relative z-10 py-20 md:py-28 lg:py-32" aria-labelledby="hero-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            {/* Left — copy */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Hook phrase */}
              <p className="mb-4 text-sm font-medium text-primary/80 tracking-wide">
                Você sabe para onde seu dinheiro está indo?
              </p>

              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Gestão financeira inteligente
              </div>

              <h1 id="hero-heading" className="text-[2.5rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem] text-foreground">
                Domine suas finanças
                <br />
                <span className="bg-gradient-to-r from-primary via-primary/80 to-ring bg-clip-text text-transparent">
                  com inteligência artificial.
                </span>
              </h1>

                <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground lg:text-lg">
                  Controle despesas, receitas, cartões, patrimônio e metas. Receba snapshots semanais e insights de IA — tudo em um só lugar.
                </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    size="lg"
                    className="group h-12 rounded-xl px-7 text-sm font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                    onClick={() => navigate("/auth?mode=signup")}
                  >
                    Criar conta grátis
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </motion.div>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-12 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/auth?mode=login")}
                >
                  Já tenho conta
                </Button>
              </div>

              {/* Microcopy below CTA */}
              <div className="mt-5 flex flex-wrap gap-4 text-[11px] text-muted-foreground/70">
                <span className="flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 text-primary/40" /> Não pedimos cartão
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3 w-3 text-primary/40" /> Leva menos de 30 segundos
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3 text-primary/40" /> Dados criptografados
                </span>
              </div>

              {/* Micro trust */}
              <div className="mt-8 flex flex-wrap gap-6 text-xs text-muted-foreground/60">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary/50" /> Criptografia de ponta
                </span>
                <span className="flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5 text-primary/50" /> Comece grátis, evolua quando quiser
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-primary/50" /> Sem cartão de crédito
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
                <InteractiveDemoWidget />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Social Proof: Testimonials ── */}
      <section className="relative z-10 pb-20" aria-labelledby="testimonials-heading">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="text-center mb-10">
              <p className="text-sm font-medium text-primary/70 mb-2">+1.000 usuários organizando suas finanças</p>
              <h2 id="testimonials-heading" className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                O que nossos usuários <span className="text-primary">dizem</span>
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-3">
            <TestimonialCard
              name="Lucas Mendes"
              role="Desenvolvedor, São Paulo"
              text="Finalmente consigo ver para onde vai cada centavo. O dashboard é incrível e a IA me ajuda a identificar gastos desnecessários."
              delay={0}
            />
            <TestimonialCard
              name="Ana Carolina"
              role="Designer, Belo Horizonte"
              text="Uso há 3 meses e já consegui economizar mais de R$ 2.000. O controle de parcelamento é perfeito."
              delay={0.08}
            />
            <TestimonialCard
              name="Rafael Santos"
              role="Autônomo, Curitiba"
              text="Como autônomo, minha renda varia muito. O FinBrasil me dá clareza total sobre meu fluxo de caixa."
              delay={0.16}
            />
          </div>
        </div>
      </section>

      {/* ── Features — Bento grid ── */}
      <section className="relative z-10 pb-28" aria-labelledby="features-heading">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="mb-10">
              <h2 id="features-heading" className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                Feito para quem quer{" "}
                <span className="text-primary">ver resultado.</span>
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Cada funcionalidade é pensada para dar mais clareza sobre suas finanças pessoais.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <BentoCard icon={BarChart3} title="Relatórios interativos" description="Gráficos comparativos mês a mês, evolução do patrimônio e tendências por categoria com exportação para PDF." delay={0} />
            <BentoCard icon={CreditCard} title="Cartões e faturas" description="Gerencie parcelas, faturas e limites de todos os seus cartões em um só lugar." delay={0.06} />
            <BentoCard icon={Bot} title="Assistente com IA" description="Converse sobre seus gastos e receba sugestões personalizadas de economia em tempo real." delay={0.1} />
            <BentoCard icon={Target} title="Metas financeiras" description="Defina objetivos visuais com barras de progresso e acompanhe seu avanço em tempo real." delay={0.14} />
            <BentoCard icon={Search} title="Pesquisa Global (⌘K)" description="Encontre qualquer despesa, receita ou conta instantaneamente com a command palette." delay={0.18} />
            <BentoCard icon={Mail} title="Snapshot Semanal" description="Receba um resumo financeiro automático toda segunda por e-mail ou WhatsApp." delay={0.22} />
            <BentoCard icon={PiggyBank} title="Patrimônio Líquido" description="Acompanhe a evolução do seu patrimônio com gráficos históricos de 12 meses." delay={0.26} />
            <BentoCard icon={Users} title="Modo Família" description="Compartilhe finanças com familiares via código de convite com permissões granulares." delay={0.3} />
            <BentoCard icon={Calendar} title="Calendário Financeiro" description="Visualize todas as despesas e receitas organizadas no calendário por dia." delay={0.34} />
            <BentoCard icon={RefreshCw} title="Despesas Recorrentes" description="Cadastre gastos fixos mensais que são gerados automaticamente todo mês." delay={0.38} />
            <BentoCard icon={Layers} title="Parcelas Inteligentes" description="Controle de parcelamentos com visão de todas as parcelas futuras e status individual." delay={0.42} />
            <BentoCard icon={Trophy} title="Gamificação e FinScore" description="Ganhe pontos por bons hábitos financeiros e acompanhe sua pontuação de saúde financeira." delay={0.46} />
            <BentoCard icon={FileSpreadsheet} title="Importação de extratos" description="Suba seu extrato CSV do banco e cadastre dezenas de despesas automaticamente." delay={0.5} />
            <BentoCard icon={Bell} title="Alertas inteligentes" description="Notificações de orçamento, faturas próximas e gastos fora do padrão." delay={0.54} />
            <BentoCard icon={ArrowLeftRight} title="Múltiplas Contas" description="Gerencie contas correntes, poupança, carteira e investimentos com transferências entre elas." delay={0.58} />
            <BentoCard icon={Activity} title="Comparativo Mensal" description="Compare meses lado a lado e identifique tendências de gasto e economia." delay={0.62} />
          </div>
        </div>
      </section>

      {/* ── AI Showcase ── */}
      <section className="relative z-10 pb-28" aria-labelledby="ai-heading">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-1 text-xs font-medium text-primary">
                  <Bot className="h-3.5 w-3.5" />
                  Inteligência Artificial
                </div>
                <h2 id="ai-heading" className="text-2xl font-bold tracking-tight sm:text-3xl mb-4 text-foreground">
                  Sua assistente financeira{" "}
                  <span className="text-primary">pessoal</span>
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground max-w-md mb-6">
                  Converse com a IA do FinBrasil para entender seus padrões de gasto, receber alertas inteligentes
                  e sugestões personalizadas para economizar mais.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: MessageSquare, text: "Análise de padrões de consumo" },
                    { icon: TrendingUp, text: "Sugestões de economia personalizadas" },
                    { icon: Shield, text: "Alertas de gastos acima da média" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
                        <item.icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      {item.text}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <AIChatPreview />
            </Reveal>
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
                  className="rounded-2xl border border-border bg-card/80 p-6 text-center backdrop-blur shadow-premium"
                >
                  <div className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                    {m.value}
                    {m.suffix && <span className="text-base font-medium text-muted-foreground ml-1">{m.suffix}</span>}
                  </div>
                  <div className="mt-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {m.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Plans Section ── */}
      <section className="relative z-10 pb-28" aria-labelledby="plans-heading">
        <div className="mx-auto max-w-7xl px-6">
          <Reveal>
            <div className="text-center mb-10">
              <h2 id="plans-heading" className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                Escolha o plano ideal para <span className="text-primary">você</span>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Comece grátis e evolua conforme suas necessidades financeiras crescem.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {PLANS.map((plan, i) => {
              const PlanIcon = plan.key === "ultra" ? Crown : plan.key === "pro" ? Sparkles : Star;
              return (
                <Reveal key={plan.key} delay={i * 0.1}>
                  <div className={`relative rounded-2xl border p-6 backdrop-blur h-full flex flex-col shadow-premium ${
                    plan.popular
                      ? "border-primary/30 bg-primary/[0.06]"
                      : "border-border bg-card/80"
                  }`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                          Mais popular
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`rounded-xl p-2.5 ring-1 ${
                        plan.popular ? "bg-primary/15 ring-primary/20" : "bg-muted ring-border"
                      }`}>
                        <PlanIcon className={`h-5 w-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <div className="text-base font-bold text-foreground">{plan.name}</div>
                        <div className={`text-sm font-bold ${plan.popular ? "text-primary" : "text-muted-foreground"}`}>{plan.price}</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                    <ul className="space-y-2 mb-6 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full h-10 rounded-xl text-sm font-semibold ${
                        plan.popular
                          ? ""
                          : "bg-muted text-foreground hover:bg-accent"
                      }`}
                      variant={plan.popular ? "default" : "secondary"}
                      onClick={() => navigate("/auth?mode=signup")}
                    >
                      {plan.key === "free" ? "Começar grátis" : "Começar agora"}
                    </Button>
                  </div>
                </Reveal>
              );
            })}
          </div>
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
                  desc: "Comece gratuitamente e evolua conforme suas necessidades. Sem surpresas.",
                },
                {
                  icon: Calendar,
                  title: "Pronto em 30 segundos",
                  desc: "Crie sua conta e comece a organizar suas finanças imediatamente.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border bg-card/80 p-6 backdrop-blur shadow-soft"
                >
                  <item.icon className="mb-3 h-5 w-5 text-primary/60" />
                  <h4 className="text-sm font-bold text-foreground/80">{item.title}</h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
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
            <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/[0.08] via-transparent to-ring/[0.04] px-8 py-16 text-center backdrop-blur md:px-16 shadow-premiumLg">
              <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/[0.06] blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-ring/[0.04] blur-3xl" />

              <div className="relative">
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
                  Comece agora.{" "}
                  <span className="bg-gradient-to-r from-primary to-ring bg-clip-text text-transparent">
                    Seu futuro financeiro começa aqui.
                  </span>
                </h2>
                <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
                  Crie sua conta e tenha o controle das suas finanças com inteligência artificial.
                </p>
                <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className="mt-8">
                  <Button
                    size="lg"
                    className="group h-12 rounded-xl px-8 text-sm font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-300"
                    onClick={() => navigate("/auth?mode=signup")}
                  >
                    Criar conta grátis
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      </main>

      {/* ── FAQ ── */}
      <FAQSection />

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-border/50 py-8" role="contentinfo">
        <div className="mx-auto max-w-7xl px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <a href="/" className="flex items-center gap-2" aria-label="FinBrasil">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/15">
              <span className="text-xs" role="img" aria-label="Moeda">🪙</span>
            </div>
            <span className="text-sm font-semibold text-muted-foreground">FinBrasil</span>
          </a>
          <span className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} FinBrasil. Todos os direitos reservados.
          </span>
        </div>
      </footer>
    </div>
  );
}
