import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Bell,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Pencil,
  Copy,
  Clock,
} from "lucide-react";

import type { Expense, TransactionStatus } from "@/types/expense";
import { formatCurrency } from "@/types/expense";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ───

type UrgencyLevel = "upcoming" | "urgent" | "today" | "overdue";

interface PlannedAlert {
  expense: Expense;
  daysUntil: number;
  urgency: UrgencyLevel;
}

interface DateGroup {
  dateStr: string;        // YYYY-MM-DD
  dateLabel: string;      // DD/MM
  alerts: PlannedAlert[];
  total: number;
}

const URGENCY_CONFIG: Record<UrgencyLevel, {
  variant: "info" | "warning" | "destructive";
  label: string;
  icon: React.ReactNode;
}> = {
  upcoming: {
    variant: "info",
    label: "Em breve",
    icon: <CalendarClock className="h-4 w-4" />,
  },
  urgent: {
    variant: "warning",
    label: "Amanhã",
    icon: <Bell className="h-4 w-4" />,
  },
  today: {
    variant: "destructive",
    label: "Hoje",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  overdue: {
    variant: "destructive",
    label: "Atrasado",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
};

// ─── Helpers ───

function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function diffDays(a: Date, b: Date): number {
  const msPerDay = 86400000;
  const aStart = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bStart = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bStart - aStart) / msPerDay);
}

function getUrgency(daysUntil: number): UrgencyLevel {
  if (daysUntil < 0) return "overdue";
  if (daysUntil === 0) return "today";
  if (daysUntil === 1) return "urgent";
  return "upcoming";
}

// ─── Component ───

interface UpcomingAlertsProps {
  expenses: Expense[];
  currentDate: Date;
  monthBalance: { income: number; balance: number };
  alertDaysBefore?: number;
  onMarkPaid?: (id: string) => void;
  onPostpone?: (id: string, days: number) => void;
  onEdit?: (expense: Expense) => void;
  onDuplicate?: (expense: Expense) => void;
  className?: string;
}

export function UpcomingAlerts({
  expenses,
  currentDate,
  monthBalance,
  alertDaysBefore = 3,
  onMarkPaid,
  onPostpone,
  onEdit,
  onDuplicate,
  className,
}: UpcomingAlertsProps) {
  const today = new Date();

  // Build alerts from planned expenses within alertDaysBefore window (or overdue)
  const alerts = useMemo<PlannedAlert[]>(() => {
    return expenses
      .filter((e) => e.status === "planned" || e.status === "overdue")
      .map((e) => {
        const expDate = parseDateLocal(e.date);
        const daysUntil = diffDays(today, expDate);
        return { expense: e, daysUntil, urgency: getUrgency(daysUntil) };
      })
      .filter((a) => {
        // Show overdue always, or upcoming within window
        if (a.urgency === "overdue") return true;
        return a.daysUntil >= 0 && a.daysUntil <= alertDaysBefore;
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [expenses, today, alertDaysBefore]);

  // Group by date
  const dateGroups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, PlannedAlert[]>();
    for (const a of alerts) {
      const key = a.expense.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries())
      .map(([dateStr, groupAlerts]) => ({
        dateStr,
        dateLabel: format(parseDateLocal(dateStr), "dd/MM"),
        alerts: groupAlerts,
        total: groupAlerts.reduce((s, a) => s + a.expense.amount, 0),
      }))
      .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
  }, [alerts]);

  // Financial risk calculation
  const financialRisk = useMemo(() => {
    if (alerts.length === 0) return null;

    // Sum planned expenses until each alert date
    const totalPlannedUpcoming = alerts.reduce((s, a) => s + a.expense.amount, 0);
    const projectedBalance = monthBalance.balance - totalPlannedUpcoming;

    if (projectedBalance < 0) {
      // Find the date when it goes negative
      let runningBalance = monthBalance.balance;
      let riskDate = "";
      for (const group of dateGroups) {
        runningBalance -= group.total;
        if (runningBalance < 0 && !riskDate) {
          riskDate = group.dateLabel;
          break;
        }
      }
      return {
        amount: Math.abs(projectedBalance),
        date: riskDate || dateGroups[dateGroups.length - 1]?.dateLabel || "",
      };
    }
    return null;
  }, [alerts, monthBalance.balance, dateGroups]);

  if (alerts.length === 0) return null;

  return (
    <div
      className={[
        "space-y-2.5 animate-in fade-in-0 slide-in-from-top-2 duration-300",
        className ?? "",
      ].join(" ")}
    >
      {/* Financial risk warning */}
      {financialRisk && (
        <Alert variant="destructive" className="rounded-2xl border border-destructive/25 bg-destructive/8 backdrop-blur shadow-sm">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            Risco de saldo negativo
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            ⚠️ Saldo pode ficar negativo em {formatCurrency(financialRisk.amount)} até{" "}
            {financialRisk.date}
          </AlertDescription>
        </Alert>
      )}

      {/* Grouped alerts */}
      {dateGroups.map((group) => {
        const worstUrgency = group.alerts.reduce<UrgencyLevel>(
          (worst, a) => {
            const order: UrgencyLevel[] = ["upcoming", "urgent", "today", "overdue"];
            return order.indexOf(a.urgency) > order.indexOf(worst) ? a.urgency : worst;
          },
          "upcoming"
        );
        const config = URGENCY_CONFIG[worstUrgency];

        return (
          <Alert
            key={group.dateStr}
            variant={config.variant as any}
            className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur shadow-sm pl-4"
          >
            {config.icon}
            <AlertTitle className="text-sm font-semibold flex items-center gap-2">
              {group.dateLabel} — {group.alerts.length}{" "}
              {group.alerts.length === 1 ? "pagamento" : "pagamentos"} —{" "}
              {formatCurrency(group.total)}
              <Badge
                variant="outline"
                className={[
                  "text-[10px] rounded-lg ml-1",
                  worstUrgency === "overdue"
                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                    : worstUrgency === "today"
                    ? "border-destructive/20 bg-destructive/10 text-destructive"
                    : worstUrgency === "urgent"
                    ? "border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"
                    : "border-primary/20 bg-primary/10 text-primary",
                ].join(" ")}
              >
                {config.label}
              </Badge>
            </AlertTitle>
            <AlertDescription className="mt-1.5 space-y-1.5">
              {group.alerts.map((a) => (
                <div
                  key={a.expense.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-foreground/80 flex-1 truncate">
                    {a.expense.description} — {formatCurrency(a.expense.amount)}
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Mark as paid */}
                    {onMarkPaid && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md"
                        title="Marcar como pago"
                        onClick={() => onMarkPaid(a.expense.id)}
                      >
                        <CheckCircle2 className="h-3 w-3 text-[hsl(var(--success))]" />
                      </Button>
                    )}

                    {/* Postpone */}
                    {onPostpone && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md"
                            title="Adiar"
                          >
                            <Clock className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[120px]">
                          <DropdownMenuItem onClick={() => onPostpone(a.expense.id, 1)}>
                            +1 dia
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPostpone(a.expense.id, 3)}>
                            +3 dias
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onPostpone(a.expense.id, 7)}>
                            +7 dias
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {/* Edit */}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md"
                        title="Editar"
                        onClick={() => onEdit(a.expense)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}

                    {/* Duplicate */}
                    {onDuplicate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-md"
                        title="Duplicar"
                        onClick={() => onDuplicate(a.expense)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}

/** Count of upcoming alerts (for badge usage) */
export function useUpcomingAlertCount(
  expenses: Expense[],
  alertDaysBefore: number = 3
): number {
  return useMemo(() => {
    const today = new Date();
    return expenses.filter((e) => {
      if (e.status !== "planned" && e.status !== "overdue") return false;
      const expDate = parseDateLocal(e.date);
      const daysUntil = diffDays(today, expDate);
      if (daysUntil < 0) return e.status !== "overdue" || true; // overdue always counts
      return daysUntil >= 0 && daysUntil <= alertDaysBefore;
    }).length;
  }, [expenses, alertDaysBefore]);
}
