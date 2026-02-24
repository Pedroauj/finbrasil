import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wallet,
  DollarSign,
  Target,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth } from "date-fns";

import type { Expense, CreditCard, CreditCardInvoice, Budget } from "@/types/expense";
import { formatCurrency, getCategoryColor } from "@/types/expense";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceAlerts } from "./InvoiceAlerts";
import { CashBalance } from "./CashBalance";
import type { MonthBalance } from "@/hooks/useExpenseStore";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/animations";

interface DashboardProps {
  expenses: Expense[];
  budget: Budget;
  prevMonthExpenses: Expense[];
  currentDate: Date;
  cards?: CreditCard[];
  invoices?: CreditCardInvoice[];
  monthBalance: MonthBalance;
}

/**
 * Glass clean (sem gradiente "manchado" e sem radial overlay).
 * Mantém premium + hover suave.
 */
const glassCard =
  "relative overflow-hidden rounded-3xl " +
  "border border-white/10 " +
  "bg-background/55 backdrop-blur-xl " +
  "shadow-[0_12px_35px_-20px_rgba(0,0,0,0.75)] " +
  "transition-all duration-300 will-change-transform " +
  "hover:-translate-y-[2px] hover:border-emerald-400/20 hover:shadow-emerald-500/10 " +
  // brilho bem leve, sem “mancha”
  "after:pointer-events-none after:absolute after:inset-0 after:bg-white/[0.02]";

export function Dashboard({
  expenses,
  budget,
  prevMonthExpenses,
  currentDate,
  cards = [],
  invoices = [],
  monthBalance,
}: DashboardProps) {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prevMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget.total - totalSpent;

  const percentUsed =
    budget.total > 0 ? Math.min((totalSpent / budget.total) * 100, 100) : 0;

  const overBudget = totalSpent > budget.total && budget.total > 0;
  const nearBudget = percentUsed >= 80 && !overBudget;

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: getCategoryColor(name) }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const weeklyData = useMemo(() => {
    const mStart = startOfMonth(currentDate);
    const mEnd = endOfMonth(currentDate);
    const weeks = eachWeekOfInterval(
      { start: mStart, end: mEnd },
      { weekStartsOn: 1 }
    );

    return weeks.map((weekStart, i) => {
      const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const total = expenses
        .filter((e) => {
          const d = new Date(e.date);
          return d >= weekStart && d <= wEnd;
        })
        .reduce((s, e) => s + e.amount, 0);

      return { name: `Sem ${i + 1}`, total };
    });
  }, [expenses, currentDate]);

  const statusColor = overBudget
    ? "text-destructive"
    : nearBudget
      ? "text-[hsl(var(--warning))]"
      : "text-[hsl(var(--success))]";

  const progressColor = overBudget
    ? "bg-destructive"
    : nearBudget
      ? "bg-[hsl(var(--warning))]"
      : "bg-[hsl(var(--success))]";

  return (
    <div className="space-y-6">
      {/* Saldo Acumulado */}
      <FadeIn>
        <CashBalance balance={monthBalance} />
      </FadeIn>

      {/* Alertas de Cartão de Crédito */}
      <FadeIn delay={0.05}>
        <InvoiceAlerts cards={cards} invoices={invoices} currentDate={currentDate} />
      </FadeIn>

      {/* Summary Cards */}
      <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StaggerItem>
          <Card className={glassCard}>
            <CardContent className="relative z-10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    Total Gasto
                  </p>
                  <p className="mt-1 text-2xl font-bold text-white/90">
                    {formatCurrency(totalSpent)}
                  </p>

                  {prevTotal > 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                      {totalSpent > prevTotal ? (
                        <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
                      )}
                      <span
                        className={
                          totalSpent > prevTotal
                            ? "text-destructive"
                            : "text-[hsl(var(--success))]"
                        }
                      >
                        {Math.abs(((totalSpent - prevTotal) / prevTotal) * 100).toFixed(0)}%{" "}
                        vs mês anterior
                      </span>
                    </div>
                  )}
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/20 p-3.5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
                  <DollarSign className="relative z-10 h-6 w-6 text-emerald-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className={glassCard}>
            <CardContent className="relative z-10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    Orçamento Restante
                  </p>
                  <p className={`mt-1 text-2xl font-bold ${statusColor}`}>
                    {budget.total > 0 ? formatCurrency(remaining) : "Não definido"}
                  </p>
                </div>

                <div
                  className={[
                    "relative overflow-hidden rounded-2xl p-3.5 ring-1",
                    overBudget
                      ? "bg-destructive/10 ring-destructive/20"
                      : nearBudget
                        ? "bg-[hsl(var(--warning))]/10 ring-[hsl(var(--warning))]/20"
                        : "bg-emerald-500/10 ring-emerald-400/20",
                  ].join(" ")}
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_45%)]" />
                  {overBudget ? (
                    <AlertTriangle className="relative z-10 h-6 w-6 text-destructive" />
                  ) : (
                    <Wallet
                      className="relative z-10 h-6 w-6"
                      style={{
                        color: nearBudget ? "hsl(var(--warning))" : "hsl(var(--success))",
                      }}
                    />
                  )}
                </div>
              </div>

              {budget.total > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs text-white/60">
                    <span>{percentUsed.toFixed(0)}% usado</span>
                    <span>{formatCurrency(budget.total)}</span>
                  </div>

                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor}`}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className={glassCard}>
            <CardContent className="relative z-10 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    Nº de Gastos
                  </p>
                  <p className="mt-1 text-2xl font-bold text-white/90">{expenses.length}</p>
                  <p className="mt-2 text-xs text-white/60">
                    Média:{" "}
                    {expenses.length > 0
                      ? formatCurrency(totalSpent / expenses.length)
                      : "R$ 0,00"}
                  </p>
                </div>

                <div className="relative overflow-hidden rounded-2xl bg-cyan-500/10 ring-1 ring-cyan-300/20 p-3.5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_45%)]" />
                  <Target className="relative z-10 h-6 w-6 text-cyan-200" />
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {/* Alert Orçamento */}
      {(overBudget || nearBudget) && budget.total > 0 && (
        <FadeIn>
          <div
            className={[
              "flex items-center gap-3 rounded-2xl border p-4 backdrop-blur-xl",
              overBudget
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
            ].join(" ")}
          >
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              {overBudget
                ? `Você ultrapassou o orçamento em ${formatCurrency(Math.abs(remaining))}!`
                : `Atenção: Você já usou ${percentUsed.toFixed(0)}% do orçamento.`}
            </p>
          </div>
        </FadeIn>
      )}

      {/* Charts */}
      <StaggerContainer staggerDelay={0.12} className="grid gap-6 lg:grid-cols-2">
        <StaggerItem>
          <Card className={glassCard}>
            <CardHeader className="relative z-10 pb-2">
              <CardTitle className="text-lg text-white/90">Gastos por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              {categoryData.length === 0 ? (
                <p className="py-12 text-center text-white/60">Sem dados para exibir</p>
              ) : (
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={50}
                        paddingAngle={2}
                      >
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="flex w-full flex-col gap-2.5 text-sm">
                    {categoryData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                        <span className="text-white/70">{d.name}</span>
                        <span className="ml-auto font-semibold text-white/90">
                          {formatCurrency(d.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className={glassCard}>
            <CardHeader className="relative z-10 pb-2">
              <CardTitle className="text-lg text-white/90">Gastos por Semana</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              {weeklyData.every((w) => w.total === 0) ? (
                <p className="py-12 text-center text-white/60">Sem dados para exibir</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.10)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="rgba(255,255,255,0.55)"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="rgba(255,255,255,0.55)"
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}