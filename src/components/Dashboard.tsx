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
  LineChart,
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
import { InvoiceAlerts } from "./InvoiceAlerts";
import { UpcomingAlerts } from "./UpcomingAlerts";
import { MonthlyReport } from "./MonthlyReport";
import { Gamification } from "./Gamification";
import { CurrencyConverter } from "./CurrencyConverter";
import { StaggerContainer, StaggerItem, PulseDot } from "@/components/ui/animations";
import { cn } from "@/lib/utils";
import { computeFinScore, type FinScoreResult } from "@/lib/finScore";
import { motion } from "framer-motion";

const appCard =
  "relative overflow-hidden rounded-2xl border border-border/50 bg-card backdrop-blur " +
  "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_hsl(var(--border)/0.5)] " +
  "transition-all duration-300 ease-out hover:-translate-y-px hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.12)]";

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

/* ─── Mini Sparkline for KPI cards ─── */
function MiniSparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({
  label,
  value,
  icon,
  sparkData,
  sparkColor,
  accentClass,
  sub,
  badge,
  badgeColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sparkData: number[];
  sparkColor: string;
  accentClass: string;
  sub?: string;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Card className={cn(appCard, accentClass, "group")}>
      <CardContent className="p-5 flex flex-col justify-between h-full">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="rounded-xl p-2 ring-1 ring-border/40 bg-background/30">
            {icon}
          </div>
        </div>
        <div className="mb-2">
          <MiniSparkline data={sparkData} color={sparkColor} height={36} />
        </div>
        <p className="text-xl font-bold tracking-tight tabular-nums" style={{ color: sparkColor }}>
          {value}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
          {badge && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${badgeColor ?? sparkColor}20`, color: badgeColor ?? sparkColor }}
            >
              {badge}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Status Mini Bar ─── */
function StatusMiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border/60 bg-background/20 px-4 py-3">
      <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
      <p className="text-base font-bold tabular-nums" style={{ color }}>{formatCurrency(value)}</p>
      <div className="mt-2 h-1 w-full rounded-full bg-muted/30 overflow-hidden">
        <div className="h-full rounded-full" style={{ backgroundColor: color, width: "100%" }} />
      </div>
    </div>
  );
}

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
    () => currentInvoices.reduce((acc, inv) => acc + inv.items.reduce((s, it) => s + Number(it.amount || 0), 0), 0),
    [currentInvoices]
  );

  const paidInvoiceDetails = useMemo(() => {
    const paidInvs = (invoices ?? []).filter((i) => i.month === monthKey && i.isPaid);
    return paidInvs.map((inv) => {
      const card = cards.find((c) => c.id === inv.cardId);
      const itemsTotal = inv.items.reduce((s, it) => s + Number(it.amount || 0), 0);
      return {
        cardName: card?.name ?? "Cartão removido",
        total: itemsTotal,
        cardId: inv.cardId,
      };
    });
  }, [invoices, monthKey, cards]);

  const income = monthBalance?.income ?? 0;
  const balance = monthBalance?.balance ?? 0;
  const carryOver = monthBalance?.carryOver ?? 0;
  const paidInvoices = monthBalance?.paidInvoices ?? 0;

  const todayReal = useMemo(() => new Date(), []);
  const isCurrentMonth = isSameMonth(todayReal, currentDate);

  const dim = daysInMonth(currentDate);
  const dayIndex = isCurrentMonth ? todayReal.getDate() : dim;

  // Use only PAID expenses for projection, and require at least 5 days of data
  const minDaysForProjection = 5;
  const hasEnoughData = isCurrentMonth && dayIndex >= minDaysForProjection;
  const avgDailySpend = hasEnoughData ? totalPaid / dayIndex : 0;
  const monthlySavings = income - totalExpenses;
  const savingsRate = income > 0 ? (monthlySavings / income) * 100 : 0;

  // Project remaining days only (paid so far + projected remaining)
  const remainingDays = isCurrentMonth ? Math.max(dim - dayIndex, 0) : 0;
  const projectedMonthSpend = hasEnoughData
    ? totalPaid + (avgDailySpend * remainingDays) + totalPlanned
    : totalExpenses;
  const projectedBalance = carryOver + income - projectedMonthSpend - paidInvoices;

  const computedBalance = carryOver + income - totalExpenses - paidInvoices;
  const balanceMismatch =
    Number.isFinite(balance) && Number.isFinite(computedBalance)
      ? Math.abs(balance - computedBalance) > 0.01
      : false;

  const showDataWarning =
    (income === 0 && totalExpenses > 0) || balanceMismatch;

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
    return [...top5, { category: "Outros", total: othersTotal }] as Array<{ category: string; total: number }>;
  }, [categoryData]);

  const STATUS_COLORS: Record<string, string> = {
    paid: "hsl(160, 84%, 45%)",
    planned: "hsl(217, 91%, 60%)",
    overdue: "hsl(0, 72%, 52%)",
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
    const parts: string[] = [];
    if (topCategory && totalExpenses > 0) {
      const pct = ((topCategory.total / totalExpenses) * 100).toFixed(0);
      parts.push(`Sua maior categoria é **${topCategory.category}** com ${pct}% dos gastos (${formatCurrency(topCategory.total)}).`);
    }
    if (isCurrentMonth && hasEnoughData) {
      parts.push(`Mantendo o ritmo atual, você fecha ${monthLabelCap.split(" ")[0].toLowerCase()} com saldo ${projectedBalance >= 0 ? "positivo" : "negativo"} de **${formatCurrency(Math.abs(projectedBalance))}**.`);
    }
    if (parts.length === 0) {
      return "Registre seus gastos para receber insights personalizados sobre suas finanças.";
    }
    return parts.join(" ");
  }, [topCategory, totalExpenses, isCurrentMonth, projectedBalance, monthLabelCap]);

  const goals = useMemo(() => getGoals(), []);

  // Sparkline data for KPIs - cumulative daily values
  const balanceSparkData = useMemo(() => {
    const out: number[] = [];
    const startBalance = (monthBalance?.carryOver ?? 0) + income;
    let run = startBalance;
    for (let d = 1; d <= Math.min(dayIndex, dim); d++) {
      const dayExp = dailySeries.find((s) => s.day === d)?.total ?? 0;
      run -= dayExp;
      out.push(run);
    }
    return out.length > 0 ? out : [0];
  }, [income, monthBalance?.carryOver, dailySeries, dayIndex, dim]);

  const incomeSparkData = useMemo(() => {
    // Simple flat line for income (since it's usually constant)
    return Array.from({ length: Math.min(dayIndex, dim) }, (_, i) => income * ((i + 1) / dim));
  }, [income, dayIndex, dim]);

  const expenseSparkData = useMemo(() => {
    return dailySeries.slice(0, dayIndex).map((d) => d.cumulative);
  }, [dailySeries, dayIndex]);

  const invoiceSparkData = useMemo(() => {
    // Simple representation
    const base = totalInvoices > 0 ? Array.from({ length: 10 }, (_, i) => totalInvoices * (0.8 + Math.sin(i) * 0.1)) : [0];
    return base;
  }, [totalInvoices]);

  // Upcoming invoice due days
  const nextInvoiceDue = useMemo(() => {
    // No dueDay available on invoice type, skip
    return null;
  }, [currentInvoices]);

  // Budget projection
  const budgetProjection = hasEnoughData ? projectedMonthSpend : totalExpenses;
  const budgetRemaining = budgetTotal - totalExpenses;
  const budgetEndDate = format(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), "dd/MM");

  return (
    <StaggerContainer className="space-y-6">
      {/* ── Insight do mês ── */}
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
              <p className="text-sm text-foreground/80 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: insightText
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                }}
              />
            </div>
          </div>
        </div>
      </StaggerItem>

      {/* ── Invoice Alerts ── */}
      <StaggerItem>
        <InvoiceAlerts cards={cards} invoices={invoices} currentDate={currentDate} />
      </StaggerItem>

      {/* ── Data Warning ── */}
      {showDataWarning && (
        <StaggerItem>
          <Card className={cn(appCard, "border-destructive/30")}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-destructive/10 p-3 ring-1 ring-destructive/15">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-foreground">Atenção: números podem estar incompletos</div>
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

      {/* ── Upcoming Alerts ── */}
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

      {/* ── 4 KPI Cards with Sparklines ── */}
      {mounted && (
        <StaggerItem>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <KpiCard
              label="Saldo do mês"
              value={formatCurrency(balance)}
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
              sparkData={balanceSparkData}
              sparkColor="hsl(160, 84%, 45%)"
              accentClass="border-primary/30"
              sub={carryOver !== 0 ? `Inclui saldo anterior: ${formatCurrency(carryOver)}` : "Receita - gastos"}
              badge={prevTotal > 0 ? `${expenseDelta > 0 ? "↑" : "↓"} ${Math.abs(expenseDelta).toFixed(1)}%` : undefined}
              badgeColor={expenseDelta > 0 ? "hsl(0, 72%, 52%)" : "hsl(160, 84%, 45%)"}
            />

            <KpiCard
              label="Receita do mês"
              value={formatCurrency(income)}
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
              sparkData={incomeSparkData}
              sparkColor="hsl(217, 91%, 60%)"
              accentClass=""
              sub="Salário + extras"
            />

            <KpiCard
              label="Gastos do mês"
              value={formatCurrency(totalExpenses)}
              icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
              sparkData={expenseSparkData}
              sparkColor="hsl(0, 72%, 52%)"
              accentClass=""
              sub={`Média ${formatCurrency(avgDailySpend)}/dia`}
              badge={prevTotal > 0 ? `↑ ${Math.abs(expenseDelta).toFixed(1)}%` : undefined}
              badgeColor={expenseDelta > 0 ? "hsl(0, 72%, 52%)" : "hsl(160, 84%, 45%)"}
            />

            <KpiCard
              label="Faturas (mês)"
              value={formatCurrency(totalInvoices)}
              icon={<CreditCardIcon className="h-4 w-4 text-muted-foreground" />}
              sparkData={invoiceSparkData}
              sparkColor="hsl(30, 95%, 55%)"
              accentClass=""
              sub={`${currentInvoices.length} ${currentInvoices.length === 1 ? "cartão ativo" : "cartões ativos"}`}
              badge={nextInvoiceDue !== null ? `vence em ${nextInvoiceDue}d` : undefined}
              badgeColor="hsl(30, 95%, 55%)"
            />
          </div>
        </StaggerItem>
      )}

      {/* ── Budget Bar ── */}
      {(budgetTotal ?? 0) > 0 && (
        <StaggerItem>
          <Card className={cn(appCard, budgetExceeded ? "border-destructive/30" : budgetPercent >= 80 ? "border-yellow-500/30" : "")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Orçamento mensal</p>
                <p className="text-sm tabular-nums">
                  <span className={cn("font-bold", budgetExceeded ? "text-destructive" : budgetPercent >= 80 ? "text-yellow-500" : "text-primary")}>
                    {formatCurrency(totalExpenses)}
                  </span>
                  <span className="text-muted-foreground"> / {formatCurrency(budgetTotal)}</span>
                </p>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    budgetExceeded ? "bg-destructive" : budgetPercent >= 80 ? "bg-yellow-500" : "bg-primary"
                  )}
                  style={{ width: `${Math.min(budgetPercent, 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between mt-3 gap-2 text-xs text-muted-foreground">
                <span>{budgetPercent.toFixed(0)}% utilizado</span>
                {budgetPercent >= 80 && !budgetExceeded && (
                  <span className="text-yellow-500 font-medium">⚠ Acima de 80% — atenção</span>
                )}
                {budgetExceeded && (
                  <span className="text-destructive font-medium">Excedido em {formatCurrency(totalExpenses - budgetTotal)}</span>
                )}
                <span>Projeção: {formatCurrency(budgetProjection)} até {budgetEndDate}</span>
                <span className={cn("font-semibold", budgetRemaining >= 0 ? "text-primary" : "text-destructive")}>
                  {formatCurrency(Math.abs(budgetRemaining))} {budgetRemaining >= 0 ? "restantes" : "acima"}
                </span>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      )}

      {/* ── Cash Balance + Quick Summary ── */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
          {/* Cash Balance - Left */}
          <Card className={cn(appCard, "xl:col-span-3")}>
            <CardContent className="p-6">
              <p className="text-xs text-muted-foreground mb-1">Saldo em caixa</p>
              <p className={cn("text-3xl font-extrabold tracking-tight tabular-nums", balance >= 0 ? "text-primary" : "text-destructive")}>
                {formatCurrency(balance)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Atualizado agora · {monthLabelCap}
              </p>

              {/* Status mini bars */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <StatusMiniBar label="Pago" value={totalPaid} color="hsl(160, 84%, 45%)" />
                <StatusMiniBar label="Planejado" value={totalPlanned} color="hsl(217, 91%, 60%)" />
                <StatusMiniBar label="Em atraso" value={totalOverdue} color="hsl(0, 72%, 52%)" />
              </div>

              {/* Paid invoices detail */}
              {paidInvoiceDetails.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCardIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Faturas pagas no mês
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {paidInvoiceDetails.map((inv) => (
                      <div
                        key={inv.cardId}
                        className="flex items-center justify-between rounded-xl border border-border/60 bg-background/20 px-3 py-2"
                      >
                        <span className="text-xs font-medium text-foreground truncate">{inv.cardName}</span>
                        <span className="text-xs font-bold tabular-nums text-destructive">
                          - {formatCurrency(inv.total)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-3 pt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground">Total faturas</span>
                      <span className="text-xs font-bold tabular-nums text-destructive">
                        - {formatCurrency(paidInvoices)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Summary - Right */}
          <Card className={cn(appCard, "xl:col-span-2")}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm font-semibold">Resumo rápido</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-3">
                  <p className="text-[11px] text-muted-foreground">Hoje</p>
                  <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(todaySpend)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {expenses.filter(e => { const dt = safeDate(e.date); return dt && isSameDay(dt, todayInView); }).length} transações
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-3">
                  <p className="text-[11px] text-muted-foreground">Semana</p>
                  <p className="text-base font-bold tabular-nums text-foreground">{formatCurrency(weekSpend)}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {expenses.filter(e => { const dt = safeDate(e.date); return dt && isSameMonth(dt, currentDate) && getWeekKey(dt) === getWeekKey(todayInView); }).length} transações
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-3 mb-2">
                <p className="text-[11px] text-muted-foreground">Projeção mensal</p>
                {hasEnoughData ? (
                  <>
                    <p className={cn("text-base font-bold tabular-nums", budgetTotal > 0 && projectedMonthSpend > budgetTotal ? "text-destructive" : "text-foreground")}>
                      ~ {formatCurrency(projectedMonthSpend)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Baseado nos últimos {dayIndex} dias</p>
                  </>
                ) : (
                  <>
                    <p className="text-base font-medium text-muted-foreground">—</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Mínimo de {minDaysForProjection} dias para projetar</p>
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-3">
                <p className="text-[11px] text-muted-foreground">Fôlego de saldo</p>
                <p className={cn("text-base font-bold tabular-nums", daysRunway !== null && daysRunway <= 5 ? "text-destructive" : "text-primary")}>
                  {daysRunway === null ? "—" : `~ ${daysRunway} dias`}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Baseado em {formatCurrency(avgDailySpend)}/dia
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* ── FinScore + Goals ── */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {/* FinScore */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn("rounded-2xl p-3 ring-1", finScoreResult.color === "primary" ? "bg-primary/10 ring-primary/15" : finScoreResult.color === "yellow" ? "bg-yellow-500/10 ring-yellow-500/15" : "bg-destructive/10 ring-destructive/15")}>
                  <Trophy className={cn("h-5 w-5", finScoreResult.color === "primary" ? "text-primary" : finScoreResult.color === "yellow" ? "text-yellow-500" : "text-destructive")} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">FinScore</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={cn("text-3xl font-extrabold tabular-nums", finScoreResult.color === "primary" ? "text-primary" : finScoreResult.color === "yellow" ? "text-yellow-500" : "text-destructive")}>
                      {finScore}
                    </span>
                    <span className="text-sm text-muted-foreground font-medium">/1000</span>
                    <span className={cn("text-xs font-bold ml-2", finScoreResult.color === "primary" ? "text-primary" : finScoreResult.color === "yellow" ? "text-yellow-500" : "text-destructive")}>
                      {finScoreResult.grade}
                    </span>
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

          {/* Goals */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm font-semibold">Metas financeiras</p>
              </div>
              {goals.length === 0 ? (
                <div className="text-center py-6">
                  <Target className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Nenhuma meta cadastrada.</p>
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
      </StaggerItem>

      {/* ── Charts: Tendência + Categorias ── */}
      {mounted && (
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
                {dailySeries.every((d) => d.total === 0) ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum gasto registrado neste mês.</p>
                ) : (
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailySeries} margin={{ left: 8, right: 12, top: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} className="fill-muted-foreground" tickMargin={8} />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          className="fill-muted-foreground"
                          tickFormatter={(v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
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
                        <Area type="monotone" dataKey="cumulative" stroke="hsl(160, 84%, 45%)" strokeWidth={2.2} fill="url(#gradGreen)" dot={false} />
                        <Area type="monotone" dataKey="total" stroke="hsl(217, 91%, 60%)" strokeWidth={1.5} fillOpacity={0} dot={false} />
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
                {categoryData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum gasto registrado neste mês.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="h-[160px] w-[160px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={pieCategoryData}
                              dataKey="total"
                              nameKey="category"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={74}
                              paddingAngle={2}
                              strokeWidth={0}
                            >
                              {pieCategoryData.map((entry) => (
                                <Cell
                                  key={entry.category}
                                  fill={entry.category === "Outros" ? "hsl(var(--muted-foreground))" : getCategoryColor(entry.category)}
                                />
                              ))}
                            </Pie>
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {categoryRanking.map((cat) => (
                        <div key={cat.category} className="flex items-center gap-2 text-xs px-1 py-1">
                          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCategoryColor(cat.category) }} />
                          <span className="flex-1 truncate text-foreground/80">{cat.category}</span>
                          <span className="tabular-nums text-muted-foreground">{formatCurrency(cat.total)}</span>
                          <span className="tabular-nums text-muted-foreground w-10 text-right">{cat.pct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </StaggerItem>
      )}

      {/* ── Status + Comparativo ── */}
      {mounted && (
        <StaggerItem>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className={appCard}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Por status</CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                {statusData.every((s) => s.total === 0) ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Sem dados para exibir.</p>
                ) : (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statusData} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                        <YAxis tickFormatter={(v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} tick={{ fontSize: 11 }} className="fill-muted-foreground" width={60} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
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
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={compareBars} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <YAxis tickFormatter={(v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} tick={{ fontSize: 11 }} className="fill-muted-foreground" width={60} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Bar dataKey="total" radius={[10, 10, 0, 0]} fill="hsl(217, 91%, 60%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </StaggerItem>
      )}

      {/* ── Gamification + Currency ── */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Gamification
            expenses={expenses}
            totalExpenses={totalExpenses}
            budgetTotal={budgetTotal}
            income={income}
            balance={balance}
          />
          <CurrencyConverter />
        </div>
      </StaggerItem>

      {/* ── Monthly Report ── */}
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

      {/* ── Debug ── */}
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
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">monthKey</div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">{monthKey}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">income</div>
                  <div className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(income)}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">balance</div>
                  <div className={cn("text-sm font-semibold tabular-nums", balance >= 0 ? "text-foreground" : "text-destructive")}>{formatCurrency(balance)}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                  <div className="text-xs text-muted-foreground">computed</div>
                  <div className={cn("text-sm font-semibold tabular-nums", computedBalance >= 0 ? "text-foreground" : "text-destructive")}>{formatCurrency(computedBalance)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      )}
    </StaggerContainer>
  );
}
