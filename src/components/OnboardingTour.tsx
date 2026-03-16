import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ArrowRight, ArrowLeft, Sparkles, Check, Rocket,
  LayoutDashboard, TableProperties, TrendingUp, CreditCard,
  RefreshCw, Calendar, Wallet, BarChart3, Target, PiggyBank,
  Layers, Activity, Users, Settings2, Bot, Zap, Star,
  ChevronRight, PartyPopper, Shield, Clock, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "finbrasil.onboarding.done";

/* ─── Types ─── */

type Phase = "welcome" | "tour" | "tips" | "complete";

interface TourStep {
  target: string;
  title: string;
  description: string;
  icon: React.ElementType;
  position: "top" | "bottom" | "left" | "right";
  tip?: string;
}

interface QuickTip {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}

/* ─── Data ─── */

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-onboarding='dashboard']",
    title: "Dashboard Inteligente",
    description: "Sua central financeira. Veja saldo, receitas, gastos, projeções, FinScore e alertas — tudo atualizado em tempo real.",
    icon: LayoutDashboard,
    position: "right",
    tip: "💡 O FinScore avalia sua saúde financeira de 0 a 100",
  },
  {
    target: "[data-onboarding='expenses']",
    title: "Controle de Gastos",
    description: "Registre despesas manualmente ou por voz com o assistente IA. Filtre por categoria, status e período. Detectamos duplicidades automaticamente.",
    icon: TableProperties,
    position: "right",
    tip: "💡 Despesas atrasadas são marcadas automaticamente",
  },
  {
    target: "[data-onboarding='income']",
    title: "Gestão de Receitas",
    description: "Cadastre seu salário com repetição automática e adicione rendas extras. Defina orçamentos por categoria para manter o controle.",
    icon: TrendingUp,
    position: "right",
    tip: "💡 O salário é copiado automaticamente para os próximos meses",
  },
  {
    target: "[data-onboarding='cards']",
    title: "Cartões de Crédito",
    description: "Gerencie múltiplos cartões, faturas com fechamento automático, compras parceladas e assinaturas recorrentes do cartão.",
    icon: CreditCard,
    position: "right",
    tip: "💡 O sistema calcula automaticamente em qual fatura sua compra cairá",
  },
  {
    target: "[data-onboarding='recurring']",
    title: "Gastos Recorrentes",
    description: "Cadastre contas fixas como aluguel, streaming e seguros. São lançadas automaticamente todo mês no dia programado.",
    icon: RefreshCw,
    position: "right",
  },
  {
    target: "[data-onboarding='installments']",
    title: "Parcelas Inteligentes",
    description: "Visualize todas as séries de parcelas ativas, simule novas compras parceladas e receba alertas quando o comprometimento estiver alto.",
    icon: Layers,
    position: "right",
    tip: "💡 O simulador mostra o impacto na sua receita antes de comprar",
  },
  {
    target: "[data-onboarding='calendar']",
    title: "Calendário Financeiro",
    description: "Veja seus lançamentos no calendário — identifique padrões, dias de pico e planeje melhor suas despesas ao longo do mês.",
    icon: Calendar,
    position: "right",
  },
  {
    target: "[data-onboarding='accounts']",
    title: "Contas e Carteiras",
    description: "Organize contas bancárias, carteiras digitais e investimentos. Faça transferências entre contas e conciliações de saldo.",
    icon: Wallet,
    position: "right",
    tip: "💡 O saldo é calculado dinamicamente a partir das movimentações",
  },
  {
    target: "[data-onboarding='networth']",
    title: "Patrimônio Líquido",
    description: "Acompanhe a evolução do seu patrimônio ao longo do tempo, com snapshots mensais de ativos, passivos e investimentos.",
    icon: PiggyBank,
    position: "right",
  },
  {
    target: "[data-onboarding='reports']",
    title: "Relatórios e Análises",
    description: "Gráficos interativos de categorias, tendências diárias, comparativos semanais e relatório financeiro completo com IA.",
    icon: BarChart3,
    position: "right",
    tip: "💡 Exporte seu relatório mensal como PDF",
  },
  {
    target: "[data-onboarding='comparative']",
    title: "Dashboard Comparativo",
    description: "Evolução de receitas e gastos nos últimos 12 meses com dados reais. Identifique tendências e sazonalidades.",
    icon: Activity,
    position: "right",
  },
  {
    target: "[data-onboarding='goals']",
    title: "Metas Financeiras",
    description: "Defina objetivos como viagem, reserva de emergência ou compra de um bem. Acompanhe o progresso visualmente.",
    icon: Target,
    position: "right",
  },
];

const QUICK_TIPS: QuickTip[] = [
  {
    icon: Bot,
    title: "Assistente com IA",
    description: "Use o assistente para registrar gastos por texto natural: \"gastei 50 no almoço\"",
    color: "text-primary",
  },
  {
    icon: Shield,
    title: "Alertas Inteligentes",
    description: "O sistema avisa quando você está perto de estourar o orçamento ou tem contas atrasadas",
    color: "text-yellow-500",
  },
  {
    icon: Clock,
    title: "Dia de Início Flexível",
    description: "Configure o dia de início do seu mês financeiro nos Ajustes (ex: dia 5 ao dia 4)",
    color: "text-blue-500",
  },
  {
    icon: DollarSign,
    title: "Dinheiro Comprometido",
    description: "Veja quanto da sua receita já está comprometido com parcelas, recorrentes e faturas",
    color: "text-destructive",
  },
  {
    icon: Zap,
    title: "Importação CSV",
    description: "Importe despesas em lote via arquivo CSV nos Ajustes",
    color: "text-primary",
  },
  {
    icon: Users,
    title: "Finanças em Família",
    description: "Convide familiares para compartilhar e acompanhar as finanças juntos",
    color: "text-primary",
  },
];

/* ─── Welcome Phase ─── */

function WelcomePhase({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onSkip} />

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, delay: 0.15 }}
        className="relative z-10 w-[90vw] max-w-lg"
      >
        <div className="rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden">
          {/* Hero */}
          <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-8 pt-10 pb-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, delay: 0.3 }}
              className="mx-auto mb-4 h-20 w-20 rounded-3xl bg-primary/15 border border-primary/20 flex items-center justify-center"
            >
              <Rocket className="h-10 w-10 text-primary" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-black text-foreground mb-2"
            >
              Bem-vindo ao FinBrasil! 🎉
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto"
            >
              Seu controle financeiro completo. Vamos fazer um tour rápido pelas
              principais funcionalidades para você aproveitar ao máximo.
            </motion.p>
          </div>

          {/* Features preview */}
          <div className="px-8 py-6 space-y-3">
            {[
              { icon: LayoutDashboard, text: "Dashboard com indicadores em tempo real", delay: 0.55 },
              { icon: Bot, text: "Assistente financeiro com inteligência artificial", delay: 0.6 },
              { icon: BarChart3, text: "Relatórios, gráficos e análise comparativa", delay: 0.65 },
              { icon: Shield, text: "Alertas inteligentes e projeções automáticas", delay: 0.7 },
            ].map(({ icon: Icon, text, delay }) => (
              <motion.div
                key={text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay }}
                className="flex items-center gap-3"
              >
                <div className="rounded-xl bg-primary/10 p-2 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">{text}</span>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-8 py-5 border-t border-border/40 flex items-center justify-between">
            <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={onSkip}>
              Pular tour
            </Button>
            <Button size="sm" className="rounded-xl gap-2 text-xs px-6" onClick={onStart}>
              Começar o tour
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Duration estimate */}
          <div className="px-8 pb-4 text-center">
            <span className="text-[10px] text-muted-foreground">
              ⏱️ Duração estimada: 2 minutos
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Tour Phase ─── */

function TourPhase({
  step,
  total,
  currentStep,
  onNext,
  onPrev,
  onSkip,
}: {
  step: number;
  total: number;
  currentStep: TourStep;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const updatePosition = useCallback(() => {
    const el = document.querySelector(currentStep.target);
    if (!el) {
      setTooltipPos({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 180 });
      setHighlightRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setHighlightRect(rect);

    let top = 0, left = 0;
    const pad = 16;
    switch (currentStep.position) {
      case "right":
        top = rect.top + rect.height / 2 - 80;
        left = rect.right + pad;
        break;
      case "left":
        top = rect.top + rect.height / 2 - 80;
        left = rect.left - 380 - pad;
        break;
      case "bottom":
        top = rect.bottom + pad;
        left = rect.left + rect.width / 2 - 180;
        break;
      case "top":
        top = rect.top - 200 - pad;
        left = rect.left + rect.width / 2 - 180;
        break;
    }

    top = Math.max(8, Math.min(top, window.innerHeight - 260));
    left = Math.max(8, Math.min(left, window.innerWidth - 390));
    setTooltipPos({ top, left });
  }, [currentStep]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [updatePosition]);

  const Icon = currentStep.icon;
  const progress = ((step + 1) / total) * 100;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Highlight */}
      {highlightRect && (
        <motion.div
          layout
          className="absolute z-[10000] pointer-events-none"
          style={{
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
          }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
        >
          <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/60 shadow-[0_0_20px_rgba(var(--primary),0.15)]" />
          <div className="absolute inset-0 rounded-2xl animate-pulse ring-2 ring-primary/20" />
        </motion.div>
      )}

      {/* Tooltip */}
      <motion.div
        key={step}
        initial={{ opacity: 0, scale: 0.9, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", damping: 20 }}
        className="absolute z-[10001] w-[360px]"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className="rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
          {/* Header with icon */}
          <div className="bg-primary/10 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="rounded-xl bg-primary/15 p-1.5">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-semibold text-primary">
                {step + 1} de {total}
              </span>
            </div>
            <button
              onClick={onSkip}
              className="rounded-lg p-1 hover:bg-background/50 transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4 space-y-2">
            <h3 className="text-base font-bold text-foreground">{currentStep.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStep.description}
            </p>
            {currentStep.tip && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl bg-muted/50 border border-border/40 px-3 py-2 text-[11px] text-muted-foreground"
              >
                {currentStep.tip}
              </motion.div>
            )}
          </div>

          {/* Progress */}
          <div className="px-5 pb-2">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "h-1 rounded-full flex-1 transition-colors duration-300",
                    i <= step ? "bg-primary" : "bg-muted/50"
                  )}
                  animate={{ scale: i === step ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 py-3 flex items-center justify-between border-t border-border/40">
            <Button
              variant="ghost"
              size="sm"
              onClick={step === 0 ? onSkip : onPrev}
              className="h-8 rounded-xl text-xs gap-1"
            >
              {step === 0 ? "Pular" : <><ArrowLeft className="h-3 w-3" /> Anterior</>}
            </Button>
            <Button
              size="sm"
              onClick={onNext}
              className="h-8 rounded-xl text-xs gap-1.5 px-5"
            >
              {step === total - 1 ? (
                <>Dicas finais <Sparkles className="h-3 w-3" /></>
              ) : (
                <>Próximo <ArrowRight className="h-3 w-3" /></>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Tips Phase ─── */

function TipsPhase({ onFinish }: { onFinish: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, delay: 0.1 }}
        className="relative z-10 w-[90vw] max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <div className="rounded-3xl border border-border/60 bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-8 pt-8 pb-6 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, delay: 0.2 }}
              className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center"
            >
              <Star className="h-8 w-8 text-primary" />
            </motion.div>
            <h2 className="text-xl font-black text-foreground mb-1">Dicas Importantes</h2>
            <p className="text-sm text-muted-foreground">
              Para aproveitar tudo que o FinBrasil oferece
            </p>
          </div>

          {/* Tips grid */}
          <div className="px-6 py-5 grid gap-3">
            {QUICK_TIPS.map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.07 }}
                className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-3.5"
              >
                <div className="rounded-xl bg-muted/50 p-2 shrink-0">
                  <tip.icon className={cn("h-4 w-4", tip.color)} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{tip.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    {tip.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Finish */}
          <div className="px-8 py-5 border-t border-border/40 text-center">
            <Button onClick={onFinish} className="rounded-xl gap-2 px-8">
              <PartyPopper className="h-4 w-4" />
              Pronto para começar!
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Complete Phase ─── */

function CompletePhase({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 15 }}
        className="relative z-10 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10, delay: 0.2 }}
          className="mx-auto mb-6 h-24 w-24 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 10, delay: 0.5 }}
          >
            <Check className="h-12 w-12 text-primary" strokeWidth={3} />
          </motion.div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-2xl font-black text-white mb-2"
        >
          Tudo pronto! 🚀
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-sm text-white/70 max-w-xs mx-auto"
        >
          Comece adicionando seu salário e registrando suas primeiras despesas.
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Component ─── */

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [tourStep, setTourStep] = useState(0);

  const finish = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
    onComplete();
  }, [onComplete]);

  const handleTourNext = () => {
    if (tourStep < TOUR_STEPS.length - 1) {
      setTourStep(s => s + 1);
    } else {
      setPhase("tips");
    }
  };

  const handleTourPrev = () => {
    if (tourStep > 0) setTourStep(s => s - 1);
  };

  return (
    <AnimatePresence mode="wait">
      {phase === "welcome" && (
        <WelcomePhase
          key="welcome"
          onStart={() => setPhase("tour")}
          onSkip={finish}
        />
      )}

      {phase === "tour" && (
        <TourPhase
          key={`tour-${tourStep}`}
          step={tourStep}
          total={TOUR_STEPS.length}
          currentStep={TOUR_STEPS[tourStep]}
          onNext={handleTourNext}
          onPrev={handleTourPrev}
          onSkip={finish}
        />
      )}

      {phase === "tips" && (
        <TipsPhase
          key="tips"
          onFinish={() => setPhase("complete")}
        />
      )}

      {phase === "complete" && (
        <CompletePhase
          key="complete"
          onClose={finish}
        />
      )}
    </AnimatePresence>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        const timer = setTimeout(() => setShowOnboarding(true), 1500);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  return {
    showOnboarding,
    completeOnboarding: () => setShowOnboarding(false),
  };
}
