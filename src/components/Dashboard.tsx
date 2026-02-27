import { useMemo, useState } from "react";
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
  CheckCircle2,
  AlertTriangle,
  Info,
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
} from "recharts";

import type { Expense, Budget, CreditCard, CreditCardInvoice } from "@/types/expense";
import {
  formatCurrency,
  sumExpenses,
  groupExpensesByCategory,
  getCategoryColor,
} from "@/types/expense";
import type { MonthBalance } from "@/hooks/useExpenseStore";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CashBalance } from "./CashBalance";
import { InvoiceAlerts } from "./InvoiceAlerts";
import { StaggerContainer, StaggerItem } from "@/components/ui/animations";

const appCard =
  "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm " +
  "transition-all duration-300 will-change-transform hover:-translate-y-[1px] hover:shadow-md " +
  "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300 " +
  "before:bg-[radial-gradient(1200px_circle_at_10%_0%,hsl(var(--primary)/0.10),transparent_45%)] " +
  "hover:before:opacity-100";

interface DashboardProps {
  expenses: Expense[];
  budget: Budget;
  prevMonthExpenses: Expense[];
  currentDate: Date;
  cards: CreditCard[];
  invoices: CreditCardInvoice[];
  monthBalance: MonthBalance;
}

type StatusKey = "paid" | "planned" | "overdue";

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

  const budgetPercent = budget.total > 0 ? Math.min((totalExpenses / budget.total) * 100, 100) : 0;
  const budgetExceeded = budget.total > 0 && totalExpenses > budget.total;

  const categoryData = useMemo(() => groupExpensesByCategory(expenses), [expenses]);

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: ptBR });

  const expenseDelta = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : 0;

  // Invoice totals for current month
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const currentInvoices = useMemo(() => invoices.filter((i) => i.month === monthKey), [invoices, monthKey]);
  const totalInvoices = useMemo(
    () => currentInvoices.reduce((acc, inv) => acc + inv.items.reduce((s, it) => s + it.amount, 0), 0),
    [currentInvoices]
  );

  const STATUS_COLORS: Record<StatusKey, string> = {
    paid: "hsl(var(--success, 152 75% 35%))",
    planned: "hsl(var(--primary))",
    overdue: "hsl(var(--destructive))",
  };

  // ===== Categoria (hover + centro dinâmico) =====
  const [activeCatIndex, setActiveCatIndex] = useState<number>(-1);

  const categoryTotal = useMemo(
    () => categoryData.reduce((acc, c) => acc + (c.total ?? 0), 0),
    [categoryData]
  );

  const activeCategory = activeCatIndex >= 0 ? categoryData[activeCatIndex] : undefined;

  // shape leve pra “pop” na fatia
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;

    return (
      <g>
        <Pie
          data={[payload]}
          dataKey="total"
          nameKey="category"
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          paddingAngle={0}
          strokeWidth={0}
        >
          <Cell fill={fill} />
        </Pie>
      </g>
    );
  };

  // ===== Status (stacked bar premium) =====
  const statusStack = useMemo(
    () => [
      {
        name: "Status",
        paid: totalPaid,
        planned: totalPlanned,
        overdue: totalOverdue,
      },
    ],
    [totalPaid, totalPlanned, totalOverdue]
  );
  const totalStatus = totalPaid + totalPlanned + totalOverdue;

  // ===== Insights =====
  const topCategory = useMemo(() => {
    if (!categoryData.length) return null;
    return [...categoryData].sort((a, b) => (b.total ?? 0) - (a.total ?? 0))[0];
  }, [categoryData]);

  const topCategoryPct =
    topCategory && categoryTotal > 0 ? (topCategory.total / categoryTotal) * 100 : 0;

  const daysInMonth = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    return new Date(y, m + 1, 0).getDate();
  }, [currentDate]);

  const avgDailySpend = totalExpenses > 0 ? totalExpenses / daysInMonth : 0;
  const runwayDays =
    avgDailySpend > 0 && monthBalance.balance > 0 ? Math.floor(monthBalance.balance / avgDailySpend) : null;

  const insights = useMemo(() => {
    const items: Array<{ icon: React.ReactNode; title: string; desc: string }> = [];

    if (prevTotal > 0) {
      const up = expenseDelta > 0;
      items.push({
        icon: up ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-primary" />,
        title: up ? "Gastos acima do mês anterior" : "Boa: gastos abaixo do mês anterior",
        desc: `${Math.abs(expenseDelta).toFixed(1)}% vs mês anterior`,
      });
    } else {
      items.push({
        icon: <Info className="h-4 w-4 text-muted-foreground" />,
        title: "Comparação mensal disponível",
        desc: "Adicione gastos no mês anterior para ver a variação.",
      });
    }

    if (topCategory && categoryTotal > 0) {
      items.push({
        icon: <Sparkles className="h-4 w-4 text-primary" />,
        title: "Maior categoria do mês",
        desc: `${topCategory.category} • ${topCategoryPct.toFixed(0)}% (${formatCurrency(topCategory.total)})`,
      });
    }

    if (budget.total > 0) {
      const remaining = budget.total - totalExpenses;
      items.push({
        icon: remaining >= 0 ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-destructive" />,
        title: remaining >= 0 ? "Orçamento sob controle" : "Orçamento excedido",
        desc: remaining >= 0
          ? `Restam ${formatCurrency(remaining)} para o limite mensal.`
          : `Você passou ${formatCurrency(Math.abs(remaining))} do limite mensal.`,
      });
    }

    if (runwayDays !== null) {
      items.push({
        icon: <Wallet className="h-4 w-4 text-primary" />,
        title: "Fôlego de saldo (estimativa)",
        desc: `No ritmo atual, seu saldo cobre ~${runwayDays} dias de gastos.`,
      });
    }

    return items.slice(0, 4);
  }, [prevTotal, expenseDelta, topCategory, topCategoryPct, categoryTotal, budget.total, totalExpenses, runwayDays]);

  return (
    <StaggerContainer className="space-y-6">
      {/* Alerts */}
      <StaggerItem>
        <InvoiceAlerts cards={cards} invoices={invoices} currentDate={currentDate} />
      </StaggerItem>

      {/* Caixa Total protagonista */}
      <StaggerItem>
        <CashBalance
          balance={monthBalance}
          className={[
            appCard,
            "ring-1 ring-primary/10",
            "before:bg-[radial-gradient(1200px_circle_at_20%_0%,hsl(var(--primary)/0.14),transparent_45%)]",
          ].join(" ")}
        />
      </StaggerItem>

      {/* KPI Cards */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Gastos do mês</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="rounded-2xl bg-destructive/10 p-3 ring-1 ring-destructive/15">
                  <ArrowDownCircle className="h-5 w-5 text-destructive" />
                </div>
              </div>
              {prevTotal > 0 && (
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
              )}
            </CardContent>
          </Card>

          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receita</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{formatCurrency(monthBalance.income)}</p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15">
                  <ArrowUpCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Faturas</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{formatCurrency(totalInvoices)}</p>
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

          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Saldo</p>
                  <p
                    className={[
                      "mt-1 text-2xl font-bold tracking-tight",
                      monthBalance.balance >= 0 ? "text-foreground" : "text-destructive",
                    ].join(" ")}
                  >
                    {formatCurrency(monthBalance.balance)}
                  </p>
                </div>
                <div
                  className={[
                    "rounded-2xl p-3 ring-1",
                    monthBalance.balance >= 0 ? "bg-primary/10 ring-primary/15" : "bg-destructive/10 ring-destructive/15",
                  ].join(" ")}
                >
                  <Wallet className={["h-5 w-5", monthBalance.balance >= 0 ? "text-primary" : "text-destructive"].join(" ")} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Budget Progress */}
      {budget.total > 0 && (
        <StaggerItem>
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Orçamento mensal</p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(totalExpenses)} / {formatCurrency(budget.total)}
                </p>
              </div>
              <Progress value={budgetPercent} className="h-2.5 rounded-full" />
              {budgetExceeded && (
                <p className="mt-2 text-xs font-medium text-destructive">
                  Orçamento excedido em {formatCurrency(totalExpenses - budget.total)}
                </p>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      )}

      {/* Charts + Insights */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Categoria */}
          <Card className={appCard}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <PieChart className="h-4 w-4 text-muted-foreground" />
                Gastos por categoria
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              {categoryData.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum gasto registrado neste mês.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative h-[170px] w-[170px] flex-shrink-0">
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {activeCategory ? activeCategory.category : "Total"}
                        </p>
                        <p className="mt-0.5 text-sm font-bold text-foreground">
                          {activeCategory ? formatCurrency(activeCategory.total) : formatCurrency(categoryTotal)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {activeCategory && categoryTotal > 0
                            ? `${((activeCategory.total / categoryTotal) * 100).toFixed(0)}%`
                            : `${categoryData.length} categorias`}
                        </p>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={categoryData}
                          dataKey="total"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={76}
                          paddingAngle={2}
                          strokeWidth={0}
                          activeIndex={activeCatIndex}
                          activeShape={renderActiveShape}
                          onMouseEnter={(_: any, idx: number) => setActiveCatIndex(idx)}
                          onMouseLeave={() => setActiveCatIndex(-1)}
                        >
                          {categoryData.map((entry) => (
                            <Cell
                              key={entry.category}
                              fill={getCategoryColor(entry.category)}
                              opacity={activeCatIndex === -1 || activeCategory?.category === entry.category ? 1 : 0.35}
                            />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="max-h-[170px] flex-1 space-y-1.5 overflow-auto">
                    {categoryData.map((cat, idx) => {
                      const isActive = idx === activeCatIndex;
                      const pct = categoryTotal > 0 ? (cat.total / categoryTotal) * 100 : 0;

                      return (
                        <button
                          key={cat.category}
                          type="button"
                          onMouseEnter={() => setActiveCatIndex(idx)}
                          onMouseLeave={() => setActiveCatIndex(-1)}
                          className={[
                            "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs transition-colors",
                            isActive ? "bg-accent/50" : "hover:bg-accent/30",
                          ].join(" ")}
                        >
                          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: getCategoryColor(cat.category) }} />
                          <span className="flex-1 truncate text-foreground/85">{cat.category}</span>
                          <span className="text-muted-foreground tabular-nums">{pct.toFixed(0)}%</span>
                          <span className="font-semibold tabular-nums text-foreground">{formatCurrency(cat.total)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Insights */}
          <Card className={appCard}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Insights do mês
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              <div className="space-y-2">
                {insights.map((it, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 transition-colors hover:bg-background/55"
                  >
                    <div className="mt-0.5 rounded-xl bg-accent/40 p-2 ring-1 ring-border/60">{it.icon}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{it.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{it.desc}</p>
                    </div>
                  </div>
                ))}
                {insights.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Adicione movimentações para gerar insights automáticos.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Status stacked */}
      <StaggerItem>
        <Card className={appCard}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por status</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {totalStatus === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Sem dados para exibir.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-3 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS.paid }} />
                    <span className="text-foreground/80">Pago</span>
                    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-3 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS.planned }} />
                    <span className="text-foreground/80">Planejado</span>
                    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(totalPlanned)}</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-3 py-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS.overdue }} />
                    <span className="text-foreground/80">Atrasado</span>
                    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(totalOverdue)}</span>
                  </div>
                </div>

                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusStack} layout="vertical" barCategoryGap="40%">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis
                        type="number"
                        tickFormatter={(v: number) => formatCurrency(v)}
                        tick={{ fontSize: 11 }}
                        className="fill-muted-foreground"
                      />
                      <YAxis type="category" dataKey="name" hide />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                        }}
                      />
                      <Bar dataKey="paid" stackId="a" fill={STATUS_COLORS.paid} radius={[10, 0, 0, 10]} />
                      <Bar dataKey="planned" stackId="a" fill={STATUS_COLORS.planned} />
                      <Bar dataKey="overdue" stackId="a" fill={STATUS_COLORS.overdue} radius={[0, 10, 10, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  );
}