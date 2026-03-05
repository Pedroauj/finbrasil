"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard as CreditCardIcon,
  PieChart,
  Sparkles,
  Activity,
  Flame,
  Percent,
  CalendarDays,
  BarChart3,
  AlertTriangle,
  Bug,
  Lightbulb,
  Trophy,
  Target,
} from "lucide-react";
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  Line,
} from "recharts";

import type { Expense, Budget, CreditCard, CreditCardInvoice } from "@/types/expense";
import {
  formatCurrency,
  sumExpenses,
  groupExpensesByCategory,
  getCategoryColor,
  groupExpensesByStatus,
} from "@/types/expense";
import type { MonthBalance } from "@/hooks/useExpenseStore";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CashBalance } from "./CashBalance";
import { InvoiceAlerts } from "./InvoiceAlerts";
import { UpcomingAlerts } from "./UpcomingAlerts";
import { MonthlyReport } from "./MonthlyReport";
import { StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { cn } from "@/lib/utils";
import { computeFinScore, type FinScoreResult } from "@/lib/finScore";

const appCard =
  "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm " +
  "transition-all duration-300 will-change-transform hover:-translate-y-[1px] hover:shadow-md";

function daysInMonth(d: Date) {
  const year = d.getFullYear();
  const month = d.getMonth();
  return new Date(year, month + 1, 0).getDate();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getWeekKey(d: Date) {
  const week = Math.floor((d.getDate() - 1) / 7) + 1;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-W${week}`;
}

function safeDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return Number.isFinite(dt.getTime()) ? dt : null;
  }
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function Tile({
  label,
  value,
  icon,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "good" | "bad";
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/20 px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-sm font-semibold tabular-nums",
          tone === "good" && "text-primary",
          tone === "bad" && "text-destructive",
          tone === "neutral" && "text-foreground"
        )}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

// computeFinScore now imported from @/lib/finScore

interface FinancialGoal {
  id: string;
  description: string;
  target: number;
  current: number;
}

function getGoals(): FinancialGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("finbrasil.goals");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface DashboardProps {
  expenses: Expense[];
  budget: Budget;
  prevMonthExpenses: Expense[];
  currentDate: Date;
  cards?: CreditCard[];
  invoices?: CreditCardInvoice[];
  monthBalance: MonthBalance;
  alertDaysBefore?: number;
  onMarkPaid?: (id: string) => void;
  onPostpone?: (id: string, days: number) => void;
  onEditExpense?: (expense: Expense) => void;
  onDuplicateExpense?: (expense: Expense) => void;
  showMonthlyReport?: boolean;
}

export function Dashboard({
  expenses,
  budget,
  prevMonthExpenses,
  currentDate,
  cards = [],
  invoices = [],
  monthBalance,
  alertDaysBefore,
  onMarkPaid,
  onPostpone,
  onEditExpense,
  onDuplicateExpense,
  showMonthlyReport,
}: DashboardProps) {
  // ✅ evita crash de hidratação/SSR com Recharts
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const debugMode = useMemo(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).has("debug");
  }, []);

  const totalExpenses = useMemo(() => sumExpenses(expenses), [expenses]);
  const totalPaid = useMemo(() => sumExpenses(expenses, { status: "paid" }), [expenses]);
  const totalPlanned = useMemo(() => sumExpenses(expenses, { status: "planned" }), [expenses]);
  const totalOverdue = useMemo(() => sumExpenses(expenses, { status: "overdue" }), [expenses]);
  const prevTotal = useMemo(() => sumExpenses(prevMonthExpenses), [prevMonthExpenses]);

  const budgetTotal = budget?.total ?? 0;
  const budgetPercent = budgetTotal > 0 ? Math.min((totalExpenses / budgetTotal) * 100, 100) : 0;
  const budgetExceeded = budgetTotal > 0 && totalExpenses > budgetTotal;

  const categoryData = useMemo(() => groupExpensesByCategory(expenses), [expenses]);
  const statusData = useMemo(() => groupExpensesByStatus(expenses), [expenses]);

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: ptBR });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const expenseDelta = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : 0;

  const monthKey = monthBalance?.monthKey ?? format(currentDate, "yyyy-MM");

  const currentInvoices = useMemo(
    () => (invoices ?? []).filter((i) => i.month === monthKey),
    [invoices, monthKey]
  );

  const totalInvoices = useMemo(
    () =>
      currentInvoices.reduce(
        (acc, inv) => acc + inv.items.reduce((s, it) => s + Number(it.amount || 0), 0),
        0
      ),
    [currentInvoices]
  );

  const income = monthBalance?.income ?? 0;
  const balance = monthBalance?.balance ?? 0;

  const todayReal = useMemo(() => new Date(), []);
  const isCurrentMonth = isSameMonth(todayReal, currentDate);

  const dim = daysInMonth(currentDate);
  const dayIndex = isCurrentMonth ? todayReal.getDate() : dim;

  const avgDailySpend = dayIndex > 0 ? totalExpenses / dayIndex : 0;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  const projectedMonthSpend = avgDailySpend * dim;
  const projectedBalance = income - projectedMonthSpend;

  const computedBalance = income - totalExpenses;
  const balanceMismatch =
    Number.isFinite(balance) && Number.isFinite(computedBalance)
      ? Math.abs(balance - computedBalance) > 0.01
      : false;

  const showDataWarning =
    (income === 0 && totalExpenses > 0) || (totalExpenses > 0 && balance === 0) || balanceMismatch;

  const dailySeries = useMemo(() => {
    const map = new Map<number, number>();
    for (const e of expenses) {
      const dt = safeDate(e.date);
      if (!dt) continue;
      if (!isSameMonth(dt, currentDate)) continue;
      const day = dt.getDate();
      map.set(day, (map.get(day) ?? 0) + (e.amount ?? 0));
    }
    const out: Array<{ day: number; total: number; cumulative: number }> = [];
    let running = 0;
    for (let d = 1; d <= dim; d++) {
      const v = map.get(d) ?? 0;
      running += v;
      out.push({ day: d, total: v, cumulative: running });
    }
    return out;
  }, [expenses, currentDate, dim]);

  const todayInView = useMemo(() => {
    if (!isCurrentMonth) return new Date(currentDate.getFullYear(), currentDate.getMonth(), dim);
    return todayReal;
  }, [isCurrentMonth, currentDate, dim, todayReal]);

  const todaySpend = useMemo(() => {
    return expenses.reduce((acc, e) => {
      const dt = safeDate(e.date);
      if (!dt) return acc;
      if (!isSameMonth(dt, currentDate)) return acc;
      if (!isSameDay(dt, todayInView)) return acc;
      return acc + (e.amount ?? 0);
    }, 0);
  }, [expenses, currentDate, todayInView]);

  const weekSpend = useMemo(() => {
    const wk = getWeekKey(todayInView);
    return expenses.reduce((acc, e) => {
      const dt = safeDate(e.date);
      if (!dt) return acc;
      if (!isSameMonth(dt, currentDate)) return acc;
      if (getWeekKey(dt) !== wk) return acc;
      return acc + (e.amount ?? 0);
    }, 0);
  }, [expenses, currentDate, todayInView]);

  const topCategory = useMemo(() => {
    if (categoryData.length === 0) return null;
    const sorted = [...categoryData].sort((a, b) => b.total - a.total);
    return sorted[0];
  }, [categoryData]);

  const daysRunway = useMemo(() => {
    if (avgDailySpend <= 0) return null;
    if (balance <= 0) return 0;
    return Math.floor(balance / avgDailySpend);
  }, [avgDailySpend, balance]);

  const categoryRanking = useMemo(() => {
    const sorted = [...categoryData].sort((a, b) => b.total - a.total);
    const top = sorted.slice(0, 6);
    return top.map((x) => ({ ...x, pct: (x.total / (totalExpenses || 1)) * 100 }));
  }, [categoryData, totalExpenses]);

  const pieCategoryData = useMemo(() => {
    if (categoryData.length <= 6) return categoryData;
    const sorted = [...categoryData].sort((a, b) => b.total - a.total);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const othersTotal = rest.reduce((acc, x) => acc + x.total, 0);
    return [...top5, { category: "Outros", total: othersTotal }] as Array<{
      category: string;
      total: number;
    }>;
  }, [categoryData]);

  const STATUS_COLORS: Record<string, string> = {
    paid: "hsl(var(--success, 152 75% 35%))",
    planned: "hsl(var(--primary))",
    overdue: "hsl(var(--destructive))",
  };

  const compareBars = useMemo(
    () => [
      { name: "Mês atual", total: totalExpenses },
      { name: "Mês anterior", total: prevTotal },
    ],
    [totalExpenses, prevTotal]
  );

  const expenseDatesInMonth = useMemo(() => {
    const dates = expenses.map((e) => safeDate(e.date)).filter(Boolean) as Date[];
    const inMonth = dates.filter((d) => isSameMonth(d, currentDate));
    if (inMonth.length === 0) return null;
    inMonth.sort((a, b) => a.getTime() - b.getTime());
    return { count: inMonth.length, min: inMonth[0], max: inMonth[inMonth.length - 1] };
  }, [expenses, currentDate]);

  const finScoreResult = useMemo(
    () => computeFinScore({
      income,
      totalExpenses,
      budgetTotal,
      balance,
      hasIncome: income > 0,
      hasBudget: budgetTotal > 0,
      hasExpenses: totalExpenses > 0,
      prevMonthExpenses: prevTotal,
    }),
    [balance, income, totalExpenses, budgetTotal, prevTotal]
  );
  const finScore = finScoreResult.total;

  const insightText = useMemo(() => {
    if (budgetTotal > 0 && budgetPercent >= 80) {
      return `Você já utilizou ${budgetPercent.toFixed(0)}% do orçamento mensal. Considere reduzir gastos nos próximos dias.`;
    }
    if (topCategory && totalExpenses > 0) {
      const pct = ((topCategory.total / totalExpenses) * 100).toFixed(0);
      return `Sua maior categoria é "${topCategory.category}" com ${pct}% dos gastos (${formatCurrency(topCategory.total)}).`;
    }
    if (savingsRate > 30) {
      return `Ótimo! Sua taxa de poupança está em ${savingsRate.toFixed(0)}%. Continue assim!`;
    }
    if (totalExpenses === 0) {
      return "Registre seus gastos para receber insights personalizados sobre suas finanças.";
    }
    return `Gasto médio diário de ${formatCurrency(avgDailySpend)}. Mantenha o controle para fechar o mês positivo.`;
  }, [budgetTotal, budgetPercent, topCategory, totalExpenses, savingsRate, avgDailySpend]);

  const goals = useMemo(() => getGoals(), []);

  return (
    <StaggerContainer className="space-y-8">
      <StaggerItem>
        <div className={cn(appCard, "border-primary/20")}>
          <div className="p-5 flex items-start gap-4">
            <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15 shrink-0">
              <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                Insight do mês
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">{insightText}</p>
            </div>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Visão geral
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
              Dashboard • <span className="text-foreground/80">{monthLabelCap}</span>
            </h2>
          </div>
        </div>
      </StaggerItem>

      <StaggerItem>
        <InvoiceAlerts cards={cards} invoices={invoices} currentDate={currentDate} />
      </StaggerItem>

      {debugMode && (
        <StaggerItem>
          <Card className={cn(appCard, "border-border/80")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Bug className="h-4 w-4 text-muted-foreground" />
                Auditoria (debug)
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">monthKey (financeiro)</div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">{monthKey}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">income (store)</div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(income)}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">balance (store)</div>
                  <div className={cn("text-sm font-semibold tabular-nums", balance >= 0 ? "text-foreground" : "text-destructive")}>
                    {formatCurrency(balance)}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">income - expenses</div>
                  <div className={cn("text-sm font-semibold tabular-nums", computedBalance >= 0 ? "text-foreground" : "text-destructive")}>
                    {formatCurrency(computedBalance)}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">despesas no mês (datas)</div>
                  <div className="text-xs text-muted-foreground">
                    {expenseDatesInMonth
                      ? `${expenseDatesInMonth.count} • ${format(expenseDatesInMonth.min, "dd/MM")} → ${format(expenseDatesInMonth.max, "dd/MM")}`
                      : "nenhuma"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      )}

      {showDataWarning && (
        <StaggerItem>
          <Card className={cn(appCard, "border-destructive/30")}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-destructive/10 p-3 ring-1 ring-destructive/15">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">
                    Atenção: números podem estar incompletos
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {income === 0 && totalExpenses > 0
                      ? "Você tem gastos registrados, mas ainda não registrou receita neste período."
                      : balanceMismatch
                        ? "O saldo informado difere do cálculo básico (receita - gastos)."
                        : "Verifique saldo inicial/caixa e receitas para que saldo e projeções reflitam sua realidade."}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      )}

      <StaggerItem>
        <UpcomingAlerts
          expenses={expenses}
          currentDate={currentDate}
          monthBalance={monthBalance}
          alertDaysBefore={alertDaysBefore}
          onMarkPaid={onMarkPaid}
          onPostpone={onPostpone}
          onEdit={onEditExpense}
          onDuplicate={onDuplicateExpense}
        />
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo do mês</p>
                  <p className={cn("mt-1 text-2xl font-bold tracking-tight tabular-nums", balance >= 0 ? "text-foreground" : "text-destructive")}>
                    {formatCurrency(balance)}
                  </p>
                </div>
                <div className={cn("rounded-2xl p-3 ring-1", balance >= 0 ? "bg-primary/10 ring-primary/15" : "bg-destructive/10 ring-destructive/15")}>
                  <Wallet className={cn("h-5 w-5", balance >= 0 ? "text-primary" : "text-destructive")} />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Receita - gastos</p>
            </CardContent>
          </Card>

          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita do mês</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">{formatCurrency(income)}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15">
                  <ArrowUpCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Salário + extras</p>
            </CardContent>
          </Card>

          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gastos do mês</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="rounded-2xl bg-destructive/10 p-3 ring-1 ring-destructive/15">
                  <ArrowDownCircle className="h-5 w-5 text-destructive" />
                </div>
              </div>
              {prevTotal > 0 ? (
                <div className="mt-3 flex items-center gap-1.5 text-xs">
                  {expenseDelta > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-destructive" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 text-primary" />
                  )}
                  <span className={expenseDelta > 0 ? "text-destructive" : "text-primary"}>
                    {Math.abs(expenseDelta).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs mês anterior</span>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Sem comparativo</p>
              )}
            </CardContent>
          </Card>

          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturas (mês)</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">{formatCurrency(totalInvoices)}</p>
                </div>
                <div className="rounded-2xl bg-accent/50 p-3 ring-1 ring-border/60">
                  <CreditCardIcon className="h-5 w-5 text-foreground/70" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {currentInvoices.length} {currentInvoices.length === 1 ? "cartão" : "cartões"} em {monthLabel}
              </p>
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <CashBalance balance={monthBalance} className={cn(appCard)} />
          </div>

          <div className="space-y-4">
            <Card className={appCard}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  Resumo rápido
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-5 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Tile label="Hoje" value={formatCurrency(todaySpend)} icon={<CalendarDays className="h-4 w-4" />} />
                  <Tile label="Semana" value={formatCurrency(weekSpend)} icon={<CalendarDays className="h-4 w-4" />} />
                </div>

                <Tile
                  label="Projeção de gastos (mês)"
                  value={`~ ${formatCurrency(projectedMonthSpend)}`}
                  sub="Mantendo o ritmo atual"
                  icon={<Flame className="h-4 w-4" />}
                  tone={budgetTotal > 0 && projectedMonthSpend > budgetTotal ? "bad" : "neutral"}
                />

                <Tile
                  label="Saldo projetado (fim do mês)"
                  value={formatCurrency(projectedBalance)}
                  sub="Receita - gasto projetado"
                  icon={<Wallet className="h-4 w-4" />}
                  tone={projectedBalance >= 0 ? "good" : "bad"}
                />

                <Tile
                  label="Fôlego de saldo"
                  value={daysRunway === null ? "—" : daysRunway === 0 ? "0 dias" : `~ ${daysRunway}+ dias`}
                  sub={daysRunway === null ? "Sem gasto médio suficiente para estimar" : "Com base no gasto médio/dia"}
                  icon={<Activity className="h-4 w-4" />}
                  tone={daysRunway !== null && daysRunway <= 3 ? "bad" : "neutral"}
                />
              </CardContent>
            </Card>

            <Card className={appCard}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={cn("rounded-2xl p-3 ring-1", finScoreResult.color === "primary" ? "bg-primary/10 ring-primary/15" : finScoreResult.color === "yellow" ? "bg-yellow-500/10 ring-yellow-500/15" : "bg-destructive/10 ring-destructive/15")}>
                    <Trophy className={cn("h-5 w-5", finScoreResult.color === "primary" ? "text-primary" : finScoreResult.color === "yellow" ? "text-yellow-500" : "text-destructive")} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FinScore</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className={cn("text-3xl font-extrabold tabular-nums", finScoreResult.color === "primary" ? "text-primary" : finScoreResult.color === "yellow" ? "text-yellow-500" : "text-destructive")}>
                        {finScore}
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">/1000</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-xs font-bold", finScoreResult.color === "primary" ? "text-primary" : finScoreResult.color === "yellow" ? "text-yellow-500" : "text-destructive")}>{finScoreResult.grade}</span>
                      <span className="text-xs text-muted-foreground">• {finScoreResult.label}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={finScore / 10} className="h-2 rounded-full" />
                </div>
                {finScoreResult.tips.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {finScoreResult.tips.slice(0, 2).map((tip, i) => (
                      <p key={i} className="text-[11px] text-muted-foreground">💡 {tip}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={appCard}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Metas financeiras</p>
                </div>
                {goals.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground mb-2">Nenhuma meta cadastrada.</p>
                    <p className="text-[11px] text-muted-foreground">Acesse Ajustes para criar suas metas.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {goals.slice(0, 3).map((g) => {
                      const pct = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0;
                      return (
                        <div key={g.id}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-foreground/80 truncate">{g.description}</span>
                            <span className="text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                          </div>
                          <Progress value={pct} className="h-1.5 rounded-full" />
                          <div className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                            <span>{formatCurrency(g.current)}</span>
                            <span>{formatCurrency(g.target)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </StaggerItem>

      {(budgetTotal ?? 0) > 0 && (
        <StaggerItem>
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Orçamento mensal</p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(totalExpenses)} / {formatCurrency(budgetTotal)}
                </p>
              </div>
              <Progress value={budgetPercent} className="h-2.5 rounded-full" />
              {budgetExceeded && (
                <p className="mt-2 text-xs text-destructive font-medium">
                  Orçamento excedido em {formatCurrency(totalExpenses - budgetTotal)}
                </p>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      )}

      {/* ✅ Charts: só no client (mounted), evitando tela branca */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className={cn(appCard, "xl:col-span-2")}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Tendência diária de gastos
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              {!mounted ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando gráfico…</p>
              ) : dailySeries.every((d) => d.total === 0) ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum gasto registrado neste mês.
                </p>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySeries} margin={{ left: 8, right: 12, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickMargin={8} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
                        width={56}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label: any) => `Dia ${label}`}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Area type="monotone" dataKey="total" strokeWidth={2.2} dot={false} fillOpacity={0.15} />
                      <Line type="monotone" dataKey="cumulative" strokeWidth={1.8} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={appCard}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                Gastos por categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              {!mounted ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando gráfico…</p>
              ) : categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum gasto registrado neste mês.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="h-[180px] w-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={pieCategoryData}
                            dataKey="total"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {pieCategoryData.map((entry) => (
                              <Cell
                                key={entry.category}
                                fill={
                                  entry.category === "Outros"
                                    ? "hsl(var(--muted-foreground))"
                                    : getCategoryColor(entry.category)
                                }
                              />
                            ))}
                          </Pie>
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {categoryRanking.map((cat) => (
                      <div
                        key={cat.category}
                        className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: getCategoryColor(cat.category) }}
                          />
                          <span className="flex-1 truncate text-foreground/80">{cat.category}</span>
                          <span className="tabular-nums text-muted-foreground">{cat.pct.toFixed(0)}%</span>
                        </div>
                        <div className="mt-2">
                          <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${clamp(cat.pct, 0, 100)}%`,
                                backgroundColor: getCategoryColor(cat.category),
                              }}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                            <span className="tabular-nums">{formatCurrency(cat.total)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Status + Comparativo */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card className={appCard}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Por status</CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              {!mounted ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando gráfico…</p>
              ) : statusData.every((s) => s.total === 0) ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Sem dados para exibir.</p>
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis
                        tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        width={60}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                        {statusData.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "hsl(var(--muted))"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={appCard}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                Comparativo mensal
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              {!mounted ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Carregando gráfico…</p>
              ) : (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareBars} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis
                        tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        width={60}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Bar dataKey="total" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {showMonthlyReport && (
        <StaggerItem>
          <MonthlyReport
            financialData={{
              month: monthLabelCap,
              income,
              totalExpenses,
              balance,
              budgetTotal,
              budgetPercent: budgetPercent.toFixed(1),
              finScore,
              finGrade: finScoreResult.grade,
              savingsRate: savingsRate.toFixed(1),
              avgDailySpend: avgDailySpend.toFixed(2),
              topCategories: categoryRanking.slice(0, 5).map(c => ({ name: c.category, amount: c.total, pct: c.pct.toFixed(1) })),
              prevMonthTotal: prevTotal,
              expenseDelta: expenseDelta.toFixed(1),
              totalPaid,
              totalPlanned,
              totalOverdue,
            }}
          />
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}