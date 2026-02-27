import { useMemo } from "react";
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
import { StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { cn } from "@/lib/utils";

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

interface DashboardProps {
  expenses: Expense[];
  budget: Budget;
  prevMonthExpenses: Expense[];
  currentDate: Date;
  cards: CreditCard[];
  invoices: CreditCardInvoice[];
  monthBalance: MonthBalance;
}

export function Dashboard({
  expenses,
  budget,
  prevMonthExpenses,
  currentDate,
  cards,
  invoices,
  monthBalance,
}: DashboardProps) {
  const totalExpenses = useMemo(() => sumExpenses(expenses), [expenses]);
  const totalPaid = useMemo(() => sumExpenses(expenses, { status: "paid" }), [expenses]);
  const totalPlanned = useMemo(() => sumExpenses(expenses, { status: "planned" }), [expenses]);
  const totalOverdue = useMemo(() => sumExpenses(expenses, { status: "overdue" }), [expenses]);
  const prevTotal = useMemo(() => sumExpenses(prevMonthExpenses), [prevMonthExpenses]);

  const budgetPercent =
    budget.total > 0 ? Math.min((totalExpenses / budget.total) * 100, 100) : 0;
  const budgetExceeded = budget.total > 0 && totalExpenses > budget.total;

  const categoryData = useMemo(() => groupExpensesByCategory(expenses), [expenses]);
  const statusData = useMemo(() => groupExpensesByStatus(expenses), [expenses]);

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: ptBR });
  const expenseDelta = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : 0;

  // =========================
  // ✅ MÊS FINANCEIRO (fonte única)
  // =========================
  const monthKey = monthBalance.monthKey;

  const currentInvoices = useMemo(
    () => invoices.filter((i) => i.month === monthKey),
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

  // KPIs base
  const income = monthBalance.income ?? 0;
  const balance = monthBalance.balance ?? 0;

  const todayReal = new Date();
  const isCurrentMonth = isSameMonth(todayReal, currentDate);

  // Para mês no passado/futuro, usa o mês “fechado”
  const dim = daysInMonth(currentDate);
  const dayIndex = isCurrentMonth ? todayReal.getDate() : dim;

  const avgDailySpend = dayIndex > 0 ? totalExpenses / dayIndex : 0;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;

  // Projeções
  const projectedMonthSpend = avgDailySpend * dim;
  const projectedBalance = income - projectedMonthSpend;

  // Integridade/consistência (evitar “saldo 0 com gasto > 0” etc.)
  const computedBalance = income - totalExpenses;
  const balanceMismatch =
    Number.isFinite(balance) && Number.isFinite(computedBalance)
      ? Math.abs(balance - computedBalance) > 0.01
      : false;

  const showDataWarning =
    (income === 0 && totalExpenses > 0) || (totalExpenses > 0 && balance === 0) || balanceMismatch;

  // Daily trend (sum by day)
  const dailySeries = useMemo(() => {
    const map = new Map<number, number>(); // day -> total
    for (const e of expenses) {
      const dt = new Date(e.date);
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

  // “Hoje” e “Semana” (resumo rápido)
  const todayInView = useMemo(() => {
    if (!isCurrentMonth) return new Date(currentDate.getFullYear(), currentDate.getMonth(), dim);
    return todayReal;
  }, [isCurrentMonth, currentDate, dim, todayReal]);

  const todaySpend = useMemo(() => {
    return expenses.reduce((acc, e) => {
      const dt = new Date(e.date);
      if (!isSameMonth(dt, currentDate)) return acc;
      if (!isSameDay(dt, todayInView)) return acc;
      return acc + (e.amount ?? 0);
    }, 0);
  }, [expenses, currentDate, todayInView]);

  const weekSpend = useMemo(() => {
    const wk = getWeekKey(todayInView);
    return expenses.reduce((acc, e) => {
      const dt = new Date(e.date);
      if (!isSameMonth(dt, currentDate)) return acc;
      if (getWeekKey(dt) !== wk) return acc;
      return acc + (e.amount ?? 0);
    }, 0);
  }, [expenses, currentDate, todayInView]);

  // Insights
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

  // Category ranking (top 6)
  const categoryRanking = useMemo(() => {
    const sorted = [...categoryData].sort((a, b) => b.total - a.total);
    const top = sorted.slice(0, 6);
    const sumTop = top.reduce((acc, x) => acc + x.total, 0) || 1;
    return top.map((x) => ({
      ...x,
      pct: (x.total / (totalExpenses || 1)) * 100,
      pctInTop: (x.total / sumTop) * 100,
    }));
  }, [categoryData, totalExpenses]);

  const STATUS_COLORS: Record<string, string> = {
    paid: "hsl(var(--success, 152 75% 35%))",
    planned: "hsl(var(--primary))",
    overdue: "hsl(var(--destructive))",
  };

  const compareBars = useMemo(() => {
    return [
      { name: "Mês atual", total: totalExpenses },
      { name: "Mês anterior", total: prevTotal },
    ];
  }, [totalExpenses, prevTotal]);

  return (
    <StaggerContainer className="space-y-6">
      {/* Alerts */}
      <StaggerItem>
        <InvoiceAlerts cards={cards} invoices={invoices} currentDate={currentDate} />
      </StaggerItem>

      {/* Integridade dos dados (confiança do usuário) */}
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
                      ? "Você tem gastos registrados, mas ainda não registrou receita neste período. Isso pode deixar saldo e projeções pouco úteis."
                      : balanceMismatch
                        ? "O saldo informado difere do cálculo básico (receita - gastos). Verifique saldo inicial/caixa e receitas do mês."
                        : "Verifique saldo inicial/caixa e receitas para que saldo e projeções reflitam sua realidade."}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Receita (mês)</div>
                      <div className="text-sm font-semibold tabular-nums">{formatCurrency(income)}</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Gastos (mês)</div>
                      <div className="text-sm font-semibold tabular-nums">{formatCurrency(totalExpenses)}</div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/20 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Saldo (calculado)</div>
                      <div
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          computedBalance >= 0 ? "text-foreground" : "text-destructive"
                        )}
                      >
                        {formatCurrency(computedBalance)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      )}

      {/* Row 1 (Topo ideal): Caixa como centro + Resumo rápido */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <CashBalance balance={monthBalance} className={cn(appCard, "xl:col-span-2")} />

          <Card className={appCard}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Resumo rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-border/60 bg-background/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Hoje
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(todaySpend)}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-4 w-4" />
                    Semana
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(weekSpend)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/20 px-4 py-3">
                <div className="text-sm font-semibold">Projeção de gastos (mês)</div>
                <div className="text-xs text-muted-foreground">
                  No ritmo atual: ~{formatCurrency(projectedMonthSpend)}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/20 px-4 py-3">
                <div className="text-sm font-semibold">Saldo projetado (fim do mês)</div>
                <div
                  className={cn(
                    "text-xs",
                    projectedBalance >= 0 ? "text-muted-foreground" : "text-destructive"
                  )}
                >
                  {formatCurrency(projectedBalance)}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/20 px-4 py-3">
                <div className="text-sm font-semibold">Fôlego de saldo (estimativa)</div>
                <div className="text-xs text-muted-foreground">
                  {daysRunway === null
                    ? "Sem gasto médio suficiente para estimar."
                    : daysRunway === 0
                      ? "No ritmo atual, seu saldo não cobre mais dias."
                      : `No ritmo atual, seu saldo cobre ~${daysRunway}+ dias.`}
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/20 px-4 py-3">
                <div className="text-sm font-semibold">Maior categoria do mês</div>
                <div className="text-xs text-muted-foreground">
                  {topCategory
                    ? `${topCategory.category} • ${((topCategory.total / (totalExpenses || 1)) * 100).toFixed(0)}% (${formatCurrency(topCategory.total)})`
                    : "Sem categorias registradas ainda."}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Row 2: KPIs primários (hierarquia correta) */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Balance (primeiro) */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Saldo atual
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-bold tracking-tight",
                      balance >= 0 ? "text-foreground" : "text-destructive"
                    )}
                  >
                    {formatCurrency(balance)}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-2xl p-3 ring-1",
                    balance >= 0
                      ? "bg-primary/10 ring-primary/15"
                      : "bg-destructive/10 ring-destructive/15"
                  )}
                >
                  <Wallet className={cn("h-5 w-5", balance >= 0 ? "text-primary" : "text-destructive")} />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Resultado do mês (receita - gastos)
              </p>
            </CardContent>
          </Card>

          {/* Income */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Receita (mês)
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(income)}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15">
                  <ArrowUpCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Salário + extras</p>
            </CardContent>
          </Card>

          {/* Total Expenses */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Despesas (mês)
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(totalExpenses)}
                  </p>
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
                <div className="mt-3 text-xs text-muted-foreground">Sem comparativo do mês anterior</div>
              )}
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Faturas (mês)
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(totalInvoices)}
                  </p>
                </div>
                <div className="rounded-2xl bg-accent/50 p-3 ring-1 ring-border/60">
                  <CreditCardIcon className="h-5 w-5 text-foreground/70" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {currentInvoices.length} {currentInvoices.length === 1 ? "cartão" : "cartões"} em{" "}
                {monthLabel}
              </p>
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Row 3: KPIs secundários (indicadores) */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* Savings rate */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Taxa de poupança
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {income > 0 ? `${clamp(savingsRate, -999, 999).toFixed(1)}%` : "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15">
                  <Percent className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Quanto sobrou da receita no mês</p>
            </CardContent>
          </Card>

          {/* Avg daily spend */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Gasto médio/dia
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(avgDailySpend)}
                  </p>
                </div>
                <div className="rounded-2xl bg-accent/50 p-3 ring-1 ring-border/60">
                  <Flame className="h-5 w-5 text-foreground/70" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Base: {dayIndex} {dayIndex === 1 ? "dia" : "dias"} ({isCurrentMonth ? "até hoje" : "mês fechado"})
              </p>
            </CardContent>
          </Card>

          {/* Projection */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Projeção (fim do mês)
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-2xl font-bold tracking-tight tabular-nums",
                      projectedBalance >= 0 ? "text-foreground" : "text-destructive"
                    )}
                  >
                    {formatCurrency(projectedBalance)}
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-2xl p-3 ring-1",
                    projectedBalance >= 0
                      ? "bg-primary/10 ring-primary/15"
                      : "bg-destructive/10 ring-destructive/15"
                  )}
                >
                  <Activity className={cn("h-5 w-5", projectedBalance >= 0 ? "text-primary" : "text-destructive")} />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                No ritmo atual: ~{formatCurrency(projectedMonthSpend)}
              </p>
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Budget Progress */}
      {budget.total > 0 && (
        <StaggerItem>
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Orçamento mensal</p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(totalExpenses)} / {formatCurrency(budget.total)}
                </p>
              </div>
              <Progress value={budgetPercent} className="h-2.5 rounded-full" />
              {budgetExceeded && (
                <p className="mt-2 text-xs text-destructive font-medium">
                  Orçamento excedido em {formatCurrency(totalExpenses - budget.total)}
                </p>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      )}

      {/* Row 4: Tendência + Categorias (núcleo analítico) */}
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
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhum gasto registrado neste mês.
                </p>
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySeries} margin={{ left: 8, right: 12, top: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                        tickMargin={8}
                      />
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
              {categoryData.length === 0 ? (
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
                            data={categoryData}
                            dataKey="total"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={82}
                            paddingAngle={2}
                            strokeWidth={0}
                          >
                            {categoryData.map((entry) => (
                              <Cell key={entry.category} fill={getCategoryColor(entry.category)} />
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
                          <span className="tabular-nums text-muted-foreground">
                            {cat.pct.toFixed(0)}%
                          </span>
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
                            <span className="tabular-nums">Top {categoryRanking.length}</span>
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

      {/* Row 5: Diagnóstico (status + comparativo) */}
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
                <>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/20 px-3 py-1 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.paid }} />
                      <span className="text-muted-foreground">Pago</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatCurrency(totalPaid)}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/20 px-3 py-1 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.planned }} />
                      <span className="text-muted-foreground">Planejado</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatCurrency(totalPlanned)}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/20 px-3 py-1 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS.overdue }} />
                      <span className="text-muted-foreground">Atrasado</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatCurrency(totalOverdue)}
                      </span>
                    </div>
                  </div>

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
                            <Cell
                              key={entry.status}
                              fill={STATUS_COLORS[entry.status] ?? "hsl(var(--muted))"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
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
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {prevTotal > 0 ? "Atual vs anterior" : "Sem mês anterior registrado"}
                </div>
                <div className="text-xs">
                  {prevTotal > 0 ? (
                    <span className={expenseDelta > 0 ? "text-destructive" : "text-primary"}>
                      {expenseDelta > 0 ? "+" : ""}
                      {expenseDelta.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>

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
            </CardContent>
          </Card>
        </div>
      </StaggerItem>
    </StaggerContainer>
  );
}