import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, TrendingUp, Flame, ShieldAlert, PiggyBank, Bell,
} from "lucide-react";
import type { Expense, Budget } from "@/types/expense";
import { formatCurrency } from "@/types/expense";

const cardClass = "rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm";

interface SmartAlert {
  id: string;
  type: "budget_warning" | "budget_critical" | "spending_spike" | "unusual_category" | "savings_tip" | "overdue_count";
  title: string;
  description: string;
  severity: "info" | "warning" | "critical";
  icon: React.ReactNode;
  value?: string;
}

interface SmartAlertsProps {
  expenses: Expense[];
  prevMonthExpenses?: Expense[];
  budget?: Budget | null;
  monthBalance?: { income: number; balance: number };
  className?: string;
}

export function SmartAlerts({
  expenses = [],
  prevMonthExpenses = [],
  budget,
  monthBalance,
  className,
}: SmartAlertsProps) {
  const alerts = useMemo<SmartAlert[]>(() => {
    const result: SmartAlert[] = [];
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const prevTotal = (prevMonthExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);

    // 1. Budget alerts
    if (budget && budget.total > 0) {
      const pct = (totalExpenses / budget.total) * 100;
      if (pct >= 100) {
        result.push({
          id: "budget_exceeded",
          type: "budget_critical",
          title: "Orçamento estourado!",
          description: `Você ultrapassou o orçamento em ${formatCurrency(totalExpenses - budget.total)}.`,
          severity: "critical",
          icon: <ShieldAlert className="h-4 w-4" />,
          value: `${pct.toFixed(0)}%`,
        });
      } else if (pct >= 80) {
        result.push({
          id: "budget_warning",
          type: "budget_warning",
          title: "Orçamento quase no limite",
          description: `Você já usou ${pct.toFixed(0)}% do orçamento. Restam ${formatCurrency(budget.total - totalExpenses)}.`,
          severity: "warning",
          icon: <AlertTriangle className="h-4 w-4" />,
          value: `${pct.toFixed(0)}%`,
        });
      }

      // Category budget alerts
      if (budget.byCategory && typeof budget.byCategory === "object") {
        const catLimits = budget.byCategory as Record<string, number>;
        const catSpending = new Map<string, number>();
        expenses.forEach(e => {
          catSpending.set(e.category, (catSpending.get(e.category) || 0) + e.amount);
        });
        
        for (const [cat, limit] of Object.entries(catLimits)) {
          if (limit <= 0) continue;
          const spent = catSpending.get(cat) || 0;
          const catPct = (spent / limit) * 100;
          if (catPct >= 90) {
            result.push({
              id: `cat_${cat}`,
              type: "budget_warning",
              title: `${cat}: ${catPct >= 100 ? "ultrapassou" : "quase no"} limite`,
              description: `Gasto: ${formatCurrency(spent)} / Limite: ${formatCurrency(limit)}`,
              severity: catPct >= 100 ? "critical" : "warning",
              icon: <Flame className="h-4 w-4" />,
              value: `${catPct.toFixed(0)}%`,
            });
          }
        }
      }
    }

    // 2. Spending spike vs previous month
    if (prevTotal > 0) {
      const variation = ((totalExpenses - prevTotal) / prevTotal) * 100;
      if (variation > 30) {
        result.push({
          id: "spending_spike",
          type: "spending_spike",
          title: "Gastos acima do normal",
          description: `Seus gastos estão ${variation.toFixed(0)}% acima do mês anterior.`,
          severity: "warning",
          icon: <TrendingUp className="h-4 w-4" />,
          value: `+${variation.toFixed(0)}%`,
        });
      }
    }

    // 3. Unusual category spending
    const curCatMap = new Map<string, number>();
    const prevCatMap = new Map<string, number>();
    expenses.forEach(e => curCatMap.set(e.category, (curCatMap.get(e.category) || 0) + e.amount));
    (prevMonthExpenses || []).forEach(e => prevCatMap.set(e.category, (prevCatMap.get(e.category) || 0) + e.amount));
    
    for (const [cat, curAmt] of curCatMap) {
      const prevAmt = prevCatMap.get(cat) || 0;
      if (prevAmt > 0 && curAmt > prevAmt * 1.5 && curAmt > 100) {
        result.push({
          id: `unusual_${cat}`,
          type: "unusual_category",
          title: `Aumento em ${cat}`,
          description: `${formatCurrency(curAmt)} este mês vs ${formatCurrency(prevAmt)} no anterior (+${(((curAmt - prevAmt) / prevAmt) * 100).toFixed(0)}%).`,
          severity: "info",
          icon: <Bell className="h-4 w-4" />,
        });
      }
    }

    // 4. Overdue count
    const overdueCount = expenses.filter(e => e.status === "overdue").length;
    if (overdueCount > 0) {
      result.push({
        id: "overdue",
        type: "overdue_count",
        title: `${overdueCount} ${overdueCount === 1 ? "pagamento atrasado" : "pagamentos atrasados"}`,
        description: "Regularize para evitar juros e manter seu FinScore alto.",
        severity: "critical",
        icon: <ShieldAlert className="h-4 w-4" />,
      });
    }

    // 5. Savings tip
    if (monthBalance && monthBalance.income > 0) {
      const savingsRate = ((monthBalance.income - totalExpenses) / monthBalance.income) * 100;
      if (savingsRate < 10 && savingsRate >= 0) {
        result.push({
          id: "savings_low",
          type: "savings_tip",
          title: "Taxa de poupança baixa",
          description: `Você está guardando apenas ${savingsRate.toFixed(0)}% da sua renda. O ideal é pelo menos 20%.`,
          severity: "info",
          icon: <PiggyBank className="h-4 w-4" />,
          value: `${savingsRate.toFixed(0)}%`,
        });
      }
    }

    return result;
  }, [expenses, prevMonthExpenses, budget, monthBalance]);

  if (alerts.length === 0) return null;

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sorted = [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <Card className={cn(cardClass, className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Alertas Inteligentes
          <Badge variant="outline" className="text-[10px] rounded-lg ml-auto">
            {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {sorted.map((alert, i) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "flex items-start gap-3 rounded-2xl p-3 border transition-colors",
              alert.severity === "critical"
                ? "bg-destructive/5 border-destructive/20"
                : alert.severity === "warning"
                ? "bg-[hsl(var(--warning))]/5 border-[hsl(var(--warning))]/20"
                : "bg-primary/5 border-primary/20"
            )}
          >
            <div className={cn(
              "h-8 w-8 rounded-xl grid place-items-center shrink-0",
              alert.severity === "critical"
                ? "bg-destructive/10 text-destructive"
                : alert.severity === "warning"
                ? "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                : "bg-primary/10 text-primary"
            )}>
              {alert.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{alert.title}</span>
                {alert.value && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] rounded-lg",
                      alert.severity === "critical"
                        ? "border-destructive/20 text-destructive"
                        : alert.severity === "warning"
                        ? "border-[hsl(var(--warning))]/20 text-[hsl(var(--warning))]"
                        : "border-primary/20 text-primary"
                    )}
                  >
                    {alert.value}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
