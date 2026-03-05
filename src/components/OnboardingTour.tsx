import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "finbrasil.onboarding.done";

interface OnboardingStep {
  target: string; // CSS selector or nav key
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
  navKey?: string;
}

const STEPS: OnboardingStep[] = [
  {
    target: "[data-onboarding='dashboard']",
    title: "📊 Dashboard",
    description: "Visão geral das suas finanças: saldo, receitas, gastos e projeções — tudo em tempo real.",
    position: "right",
  },
  {
    target: "[data-onboarding='expenses']",
    title: "💸 Gastos",
    description: "Registre, edite e acompanhe todas as suas despesas organizadas por categoria e status.",
    position: "right",
  },
  {
    target: "[data-onboarding='income']",
    title: "💰 Receitas",
    description: "Cadastre seu salário e rendas extras. Defina seu orçamento mensal aqui.",
    position: "right",
  },
  {
    target: "[data-onboarding='accounts']",
    title: "🏦 Contas",
    description: "Gerencie suas contas bancárias, carteiras e investimentos em um só lugar.",
    position: "right",
  },
  {
    target: "[data-onboarding='reports']",
    title: "📈 Relatórios",
    description: "Gráficos interativos e análises detalhadas para entender seus padrões de gasto.",
    position: "right",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  const currentStep = STEPS[step];

  const updatePosition = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.target);
    if (!el) {
      // Fallback: center of screen
      setTooltipPos({ top: window.innerHeight / 2 - 80, left: window.innerWidth / 2 - 160 });
      setHighlightRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    setHighlightRect(rect);

    let top = 0, left = 0;
    const pad = 16;
    switch (currentStep.position) {
      case "right":
        top = rect.top + rect.height / 2 - 60;
        left = rect.right + pad;
        break;
      case "left":
        top = rect.top + rect.height / 2 - 60;
        left = rect.left - 320 - pad;
        break;
      case "bottom":
        top = rect.bottom + pad;
        left = rect.left + rect.width / 2 - 160;
        break;
      case "top":
        top = rect.top - 160 - pad;
        left = rect.left + rect.width / 2 - 160;
        break;
    }

    // Clamp to viewport
    top = Math.max(8, Math.min(top, window.innerHeight - 200));
    left = Math.max(8, Math.min(left, window.innerWidth - 340));

    setTooltipPos({ top, left });
  }, [currentStep]);

  useEffect(() => {
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [updatePosition, step]);

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  };

  const prev = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const finish = () => {
    try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch {}
    onComplete();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999]">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={finish}
        />

        {/* Highlight cutout */}
        {highlightRect && (
          <motion.div
            layout
            className="absolute rounded-xl ring-2 ring-primary/50 bg-transparent z-[10000] pointer-events-none"
            style={{
              top: highlightRect.top - 4,
              left: highlightRect.left - 4,
              width: highlightRect.width + 8,
              height: highlightRect.height + 8,
            }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <div className="absolute inset-0 rounded-xl animate-pulse ring-2 ring-primary/30" />
          </motion.div>
        )}

        {/* Tooltip */}
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 20 }}
          className="absolute z-[10001] w-[320px]"
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
        >
          <div className="rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-primary/10 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-primary">
                  Passo {step + 1} de {STEPS.length}
                </span>
              </div>
              <button
                onClick={finish}
                className="rounded-lg p-1 hover:bg-background/50 transition-colors"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <h3 className="text-base font-bold text-foreground mb-1">
                {currentStep?.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStep?.description}
              </p>
            </div>

            {/* Progress bar */}
            <div className="px-5 pb-2">
              <div className="h-1 w-full rounded-full bg-muted/40 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                  transition={{ type: "spring", damping: 20 }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-3 flex items-center justify-between border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={step === 0 ? finish : prev}
                className="h-8 rounded-xl text-xs gap-1"
              >
                {step === 0 ? (
                  "Pular tour"
                ) : (
                  <>
                    <ArrowLeft className="h-3 w-3" />
                    Anterior
                  </>
                )}
              </Button>
              <Button
                size="sm"
                onClick={next}
                className="h-8 rounded-xl text-xs gap-1"
              >
                {step === STEPS.length - 1 ? "Concluir" : "Próximo"}
                {step < STEPS.length - 1 && <ArrowRight className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    try {
      const done = localStorage.getItem(ONBOARDING_KEY);
      if (!done) {
        // Delay to let page render
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
