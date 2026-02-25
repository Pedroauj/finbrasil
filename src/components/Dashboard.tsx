import { useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Wallet,
  DollarSign,
  Target,
  ListChecks,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
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
  AreaChart,
  Area,
} from "recharts";
import type { Expense, CreditCard, CreditCardInvoice, Budget } from "@/types/expense";
import { formatCurrency, getCategoryColor } from "@/types/expense";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceAlerts } from "./InvoiceAlerts";
import { CashBalance } from "./CashBalance";
import type { MonthBalance } from "@/hooks/useExpenseStore";
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/animations";

import {
  filterByMonth,
  groupByCategory,
  groupByStatus,
  weeklyTotalsForMonth,
  cumulativeExpensesDaily,
  topExpenses,
} from "@/lib/analytics";

interface DashboardProps {
  expenses: Expense[];
  budget: Budget;
  prevMonthExpenses: Expense[];
  currentDate: Date;
  cards?: CreditCard[];
  invoices?: CreditCardInvoice[];
  monthBalance: MonthBalance;
}

/** =========================
 *  Layout tokens / helpers
 *  ========================= */

const appCard =
  "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm " +
  "transition-all duration-300 will-change-transform hover:-translate-y-[1px] hover:shadow-md " +
  "h-full flex flex-col";

const chartShell =
  "rounded-2xl border border-border/50 bg-card/50 p-3 shadow-sm";

const chartHeight = 240;

const tooltipStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid hsl(var(--border) / 0.6)",
  background: "hsl(var(--card) / 0.90)",
  backdropFilter: "blur(10px)",
  boxShadow: "0 14px 34px -24px rgba(0,0,0,0.55)",
};

function formatShortCurrency(value: number): string {
  const v = Number(value || 0);
  const abs = Math.abs(v);

  // R$ 1.2k / 1.2M
  if (abs >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function formatAxisCurrency(v: any) {
  return formatShortCurrency(Number(v || 0));
}

function truncateLabel(label: string, max = 18) {
  if (!label) return "";
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function IconBadge({
  variant = "primary",
  children,
}: {
  variant?: "primary" | "muted" | "warning" | "destructive" | "success";
  children: React.ReactNode;
}) {
  const styles =
    variant === "destructive"
      ? "bg-destructive/10 ring-destructive/15 text-destructive"
      : variant === "warning"
        ? "bg-[hsl(var(--warning))]/10 ring-[hsl(var(--warning))]/15 text-[hsl(var(--warning))]"
        : variant === "success"
          ? "bg-[hsl(var(--success))]/10 ring-[hsl(var(--success))]/15 text-[hsl(var(--success))]"
          : variant === "muted"
            ? "bg-muted/50 ring-border/60 text-foreground/80"
            : "bg-primary/10 ring-primary/15 text-primary";

  return (
    <div className={`relative overflow-hidden rounded-2xl p-3 ring-1 ${styles}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--foreground)/0.10),transparent_45%)]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  rightSlot,
  children,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className={appCard}>
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base text-foreground">{title}</CardTitle>
            {subtitle ? (
              <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-3 flex-1">
        {children}
      </CardContent>
    </Card>
  );
}

/** =========================
 *  Dashboard
 *  ========================= */

export function Dashboard({
  expenses,
  budget,
  prevMonthExpenses,
  currentDate,
  cards = [],
  invoices = [],
  monthBalance,
}: DashboardProps) {
  const expensesThisMonth = useMemo(
    () => filterByMonth(expenses, currentDate),
    [expenses, currentDate]
  );

  const totalSpent = expensesThisMonth.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prevMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget.total - totalSpent;

  const percentUsed =
    budget.total > 0 ? Math.min((totalSpent / budget.total) * 100, 100) : 0;

  const overBudget = totalSpent > budget.total && budget.total > 0;
  const nearBudget = percentUsed >= 80 && !overBudget;

  const categoryData = useMemo(() => {
    const base = groupByCategory(expensesThisMonth);
    return base.map((d) => ({ ...d, color: getCategoryColor(d.name) }));
  }, [expensesThisMonth]);

  const weeklyData = useMemo(() => {
    return weeklyTotalsForMonth(expensesThisMonth, currentDate);
  }, [expensesThisMonth, currentDate]);

  const statusData = useMemo(() => {
    return groupByStatus(expensesThisMonth);
  }, [expensesThisMonth]);

  const cumulativeData = useMemo(() => {
    return cumulativeExpensesDaily({ expenses: expensesThisMonth, baseDate: currentDate });
  }, [expensesThisMonth, currentDate]);

  const incomeVsExpenseData = useMemo(() => {
    const income = Number(monthBalance?.income || 0);
    const expense =
      Number(monthBalance?.expenses || 0) + Number(monthBalance?.paidInvoices || 0);

    return [
      { name: "Receitas", total: income },
      { name: "Despesas", total: expense },
    ];
  }, [monthBalance]);

  const top10Expenses = useMemo(() => {
    return topExpenses(expensesThisMonth, 10);
  }, [expensesThisMonth]);

  const changePct =
    prevTotal > 0 ? Math.abs(((totalSpent - prevTotal) / prevTotal) * 100) : 0;

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

  const statusPalette: Record<string, string> = {
    paid: "hsl(var(--success))",
    planned: "hsl(var(--primary))",
    overdue: "hsl(var(--destructive))",
  };

  const statusIcon = (key: string) => {
    if (key === "paid") return <CheckCircle2 className="h-4 w-4" />;
    if (key === "planned") return <Clock className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const monthIncome = Number(monthBalance?.income || 0);
  const monthExpense =
    Number(monthBalance?.expenses || 0) + Number(monthBalance?.paidInvoices || 0);
  const monthDelta = monthIncome - monthExpense;

  const deltaBadge =
    monthDelta >= 0 ? (
      <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-1 text-xs">
        <ArrowUpRight className="h-3.5 w-3.5 text-[hsl(var(--success))]" />
        <span className="text-muted-foreground">Saldo</span>
        <span className="font-semibold text-[hsl(var(--success))]">
          {formatCurrency(monthDelta)}
        </span>
      </div>
    ) : (
      <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-2 py-1 text-xs">
        <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
        <span className="text-muted-foreground">Déficit</span>
        <span className="font-semibold text-destructive">
          {formatCurrency(Math.abs(monthDelta))}
        </span>
      </div>
    );

  return (
    <div className="space-y-5">
      <FadeIn>
        <CashBalance balance={monthBalance} />
      </FadeIn>

      <FadeIn delay={0.05}>
        <InvoiceAlerts cards={cards} invoices={invoices} currentDate={currentDate} />
      </FadeIn>

      {/* Summary */}
      <StaggerContainer className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total gasto */}
        <StaggerItem className="h-full">
          <Card className={appCard}>
            <CardContent className="p-5 h-full flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Total gasto</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {formatCurrency(totalSpent)}
                  </p>

                  <div className="mt-2 min-h-[18px]">
                    {prevTotal > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs">
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
                          {changePct.toFixed(0)}% vs mês anterior
                        </span>
                      </div>
                    ) : (
                      <div />
                    )}
                  </div>
                </div>

                <IconBadge variant="primary">
                  <DollarSign className="h-6 w-6" />
                </IconBadge>
              </div>

              <div className="mt-3.5 min-h-[44px]" />
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Orçamento restante */}
        <StaggerItem className="h-full">
          <Card className={appCard}>
            <CardContent className="p-5 h-full flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Orçamento restante</p>
                  <p className={`mt-1 text-2xl font-bold ${statusColor}`}>
                    {budget.total > 0 ? formatCurrency(remaining) : "Não definido"}
                  </p>
                </div>

                <IconBadge variant={overBudget ? "destructive" : nearBudget ? "warning" : "primary"}>
                  {overBudget ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    <Wallet className="h-6 w-6" />
                  )}
                </IconBadge>
              </div>

              <div className="mt-3.5 min-h-[44px]">
                {budget.total > 0 ? (
                  <>
                    <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                      <span>{percentUsed.toFixed(0)}% usado</span>
                      <span>{formatCurrency(budget.total)}</span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/45">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor}`}
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <div />
                )}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* Nº de gastos */}
        <StaggerItem className="h-full">
          <Card className={appCard}>
            <CardContent className="p-5 h-full flex flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Nº de gastos</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">
                    {expensesThisMonth.length}
                  </p>

                  <div className="mt-2 min-h-[18px]">
                    <p className="text-xs text-muted-foreground">
                      Média:{" "}
                      {expensesThisMonth.length > 0
                        ? formatCurrency(totalSpent / expensesThisMonth.length)
                        : "R$ 0,00"}
                    </p>
                  </div>
                </div>

                <IconBadge variant="muted">
                  <Target className="h-6 w-6" />
                </IconBadge>
              </div>

              <div className="mt-3.5 min-h-[44px]" />
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerContainer>

      {(overBudget || nearBudget) && budget.total > 0 && (
        <FadeIn>
          <div
            className={[
              "flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 shadow-sm",
              overBudget ? "text-destructive" : "text-[hsl(var(--warning))]",
            ].join(" ")}
          >
            <span
              className={[
                "grid h-9 w-9 place-items-center rounded-xl ring-1",
                overBudget
                  ? "bg-destructive/10 ring-destructive/15"
                  : "bg-[hsl(var(--warning))]/10 ring-[hsl(var(--warning))]/15",
              ].join(" ")}
            >
              <AlertTriangle className="h-4 w-4" />
            </span>

            <p className="text-sm font-medium">
              {overBudget
                ? `Você ultrapassou o orçamento em ${formatCurrency(Math.abs(remaining))}!`
                : `Atenção: Você já usou ${percentUsed.toFixed(0)}% do orçamento.`}
            </p>
          </div>
        </FadeIn>
      )}

      {/* Charts */}
      <StaggerContainer staggerDelay={0.12} className="grid items-stretch gap-4 lg:grid-cols-2">
        {/* Gastos por categoria */}
        <StaggerItem className="h-full">
          <ChartCard title="Gastos por categoria" subtitle="Ranking do mês">
            {categoryData.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">Sem dados para exibir</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                <div className={chartShell}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={78}
                        innerRadius={54}
                        paddingAngle={2}
                      >
                        {categoryData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col justify-center gap-2.5 text-sm">
                  {categoryData.slice(0, 7).map((d) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{truncateLabel(d.name, 22)}</span>
                      <span className="ml-auto font-semibold text-foreground">
                        {formatCurrency(d.value)}
                      </span>
                    </div>
                  ))}
                  {categoryData.length > 7 && (
                    <div className="pt-1 text-xs text-muted-foreground">
                      +{categoryData.length - 7} categorias
                    </div>
                  )}
                </div>
              </div>
            )}
          </ChartCard>
        </StaggerItem>

        {/* Gastos por semana */}
        <StaggerItem className="h-full">
          <ChartCard title="Gastos por semana" subtitle="Distribuição no mês">
            {weeklyData.every((w) => w.total === 0) ? (
              <p className="py-10 text-center text-muted-foreground">Sem dados para exibir</p>
            ) : (
              <div className={chartShell}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={weeklyData} margin={{ left: 8, right: 8, top: 6, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 6"
                      stroke="hsl(var(--border) / 0.55)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatAxisCurrency}
                      width={46}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </StaggerItem>

        {/* Status dos gastos */}
        <StaggerItem className="h-full">
          <ChartCard title="Status dos gastos" subtitle="Pago / Planejado / Atrasado">
            {statusData.every((s) => s.total === 0) ? (
              <p className="py-10 text-center text-muted-foreground">Sem dados para exibir</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
                <div className={chartShell}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="total"
                        cx="50%"
                        cy="50%"
                        outerRadius={78}
                        innerRadius={54}
                        paddingAngle={2}
                      >
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={statusPalette[entry.key]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={tooltipStyle}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col justify-center gap-2.5 text-sm">
                  {statusData.map((s) => (
                    <div key={s.key} className="flex items-center gap-2">
                      <div
                        className="grid h-8 w-8 place-items-center rounded-xl ring-1 ring-border/50"
                        style={{ background: `${statusPalette[s.key]}20` }}
                      >
                        <span style={{ color: statusPalette[s.key] }}>{statusIcon(s.key)}</span>
                      </div>
                      <span className="text-muted-foreground">{s.label}</span>

                      <div className="ml-auto flex items-baseline gap-2">
                        <span className="font-semibold text-foreground">
                          {formatCurrency(s.total)}
                        </span>
                        <span className="text-xs text-muted-foreground">{s.percent.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </StaggerItem>

        {/* Gasto acumulado no mês */}
        <StaggerItem className="h-full">
          <ChartCard title="Gasto acumulado no mês" subtitle="Evolução diária">
            {cumulativeData.every((d) => d.total === 0) ? (
              <p className="py-10 text-center text-muted-foreground">Sem dados para exibir</p>
            ) : (
              <div className={chartShell}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <AreaChart data={cumulativeData} margin={{ left: 8, right: 8, top: 6, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 6"
                      stroke="hsl(var(--border) / 0.55)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatAxisCurrency}
                      width={46}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={tooltipStyle}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.20)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </StaggerItem>

        {/* Receitas vs Despesas */}
        <StaggerItem className="h-full">
          <ChartCard
            title="Receitas vs Despesas"
            subtitle="Comparativo do mês"
            rightSlot={deltaBadge}
          >
            {incomeVsExpenseData.every((d) => d.total === 0) ? (
              <p className="py-10 text-center text-muted-foreground">Sem dados para exibir</p>
            ) : (
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-3">
                    <p className="text-xs text-muted-foreground">Receitas</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatCurrency(monthIncome)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-card/50 p-3">
                    <p className="text-xs text-muted-foreground">Despesas</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatCurrency(monthExpense)}
                    </p>
                  </div>
                </div>

                <div className={chartShell}>
                  <ResponsiveContainer width="100%" height={chartHeight - 30}>
                    <BarChart data={incomeVsExpenseData} barGap={12} margin={{ left: 8, right: 8, top: 6 }}>
                      <CartesianGrid
                        strokeDasharray="3 6"
                        stroke="hsl(var(--border) / 0.55)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatAxisCurrency}
                        width={46}
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value as number)}
                        contentStyle={tooltipStyle}
                      />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </ChartCard>
        </StaggerItem>

        {/* Top 10 gastos do mês */}
        <StaggerItem className="h-full">
          <ChartCard
            title="Top 10 gastos do mês"
            subtitle="Maiores lançamentos do período"
            rightSlot={
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ListChecks className="h-4 w-4" />
                <span>Maior → menor</span>
              </div>
            }
          >
            {top10Expenses.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">Sem dados para exibir</p>
            ) : (
              <div className={chartShell}>
                {/* altura proporcional: evita espaço vazio */}
                <ResponsiveContainer
                  width="100%"
                  height={Math.max(200, Math.min(320, top10Expenses.length * 34))}
                >
                  <BarChart
                    data={top10Expenses.map((x) => ({
                      ...x,
                      name: truncateLabel(String(x.name || ""), 22),
                    }))}
                    layout="vertical"
                    margin={{ left: 8, right: 8, top: 6, bottom: 6 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 6"
                      stroke="hsl(var(--border) / 0.55)"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={formatAxisCurrency}
                      width={46}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={tooltipStyle}
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[10, 10, 10, 10]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChartCard>
        </StaggerItem>
      </StaggerContainer>
    </div>
  );
}