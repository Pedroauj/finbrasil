import { PLANS, type PlanTier } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";

const PLAN_ICONS: Record<PlanTier, React.ElementType> = {
  free: Star,
  pro: Sparkles,
  ultra: Crown,
};

interface PlansSectionProps {
  currentPlan: PlanTier;
}

export function PlansSection({ currentPlan }: PlansSectionProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur lg:col-span-2">
      <div className="flex items-center gap-2 mb-1">
        <Crown className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Planos & Cobrança</div>
      </div>
      <div className="text-xs text-muted-foreground mb-1">
        Seu plano atual:{" "}
        <Badge variant="secondary" className="ml-1">
          {PLANS.find((p) => p.key === currentPlan)?.name ?? "Essencial"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = PLAN_ICONS[plan.key];
          const isCurrent = currentPlan === plan.key;
          return (
            <div
              key={plan.key}
              className={cn(
                "relative flex flex-col rounded-2xl border p-5 transition-all",
                plan.popular
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/10"
                  : "border-border/40 bg-background/20",
                isCurrent && "ring-2 ring-primary/30"
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-wider font-bold px-3 py-0.5">
                  Mais popular
                </Badge>
              )}

              {/* Header: icon + name + price */}
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "rounded-xl p-2.5 ring-1",
                  plan.popular ? "bg-primary/10 ring-primary/15" : "bg-muted/30 ring-border/40"
                )}>
                  <Icon className={cn("h-5 w-5", plan.popular ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div>
                  <div className="text-base font-bold">{plan.name}</div>
                  <div className="text-sm text-primary font-bold">{plan.price}</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>

              {/* Features list — grows to fill space */}
              <ul className="space-y-2 mb-5 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-foreground/70">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA button — always at bottom */}
              {isCurrent ? (
                <Button variant="outline" className="w-full h-10 rounded-xl text-xs" disabled>
                  Plano atual
                </Button>
              ) : (
                <Button
                  className={cn(
                    "w-full h-10 rounded-xl text-xs font-semibold",
                    plan.popular && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => setUpgradeOpen(true)}
                >
                  {plan.key === "free" ? "Começar grátis" : "Começar agora"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Referral */}
      <div className="mt-4 rounded-2xl border border-border/40 bg-background/20 p-4">
        <div className="text-sm font-semibold mb-1">Indique amigos</div>
        <p className="text-xs text-muted-foreground mb-2">
          Convide um amigo e ambos recebem 1 mês de acesso ao Plano Inteligente.
        </p>
        <Button variant="outline" className="h-9 rounded-xl text-xs" onClick={() => setUpgradeOpen(true)}>
          Copiar link de convite
        </Button>
      </div>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Em breve!</DialogTitle>
            <DialogDescription>
              Em breve você poderá fazer upgrade direto pelo FinBrasil. Fique ligado!
            </DialogDescription>
          </DialogHeader>
          <Button className="h-10 rounded-xl" onClick={() => setUpgradeOpen(false)}>
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
