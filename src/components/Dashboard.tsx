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

import type {
  Expense,
  Budget,
  CreditCard,
  CreditCardInvoice,
} from "@/types/expense";
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
import { StaggerContainer, StaggerItem, FadeIn } from "@/components/ui/animations";

const appCard =
  "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm " +
  "transition-all duration-300 will-change-transform hover:-translate-y-[1px] hover:shadow-md";

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

  const budgetPercent = budget.total > 0 ? Math.min((totalExpenses / budget.total) * 100, 100) : 0;
  const budgetExceeded = budget.total > 0 && totalExpenses > budget.total;

  const categoryData = useMemo(() => groupExpensesByCategory(expenses), [expenses]);
  const statusData = useMemo(() => groupExpensesByStatus(expenses), [expenses]);

  const monthLabel = format(currentDate, "MMMM yyyy", { locale: ptBR });

  const expenseDelta = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : 0;

  // Invoice totals for current month
  const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const currentInvoices = useMemo(
    () => invoices.filter((i) => i.month === monthKey),
    [invoices, monthKey]
  );
  const totalInvoices = useMemo(
    () => currentInvoices.reduce((acc, inv) => acc + inv.items.reduce((s, it) => s + it.amount, 0), 0),
    [currentInvoices]
  );

  const STATUS_COLORS: Record<string, string> = {
    paid: "hsl(var(--success, 152 75% 35%))",
    planned: "hsl(var(--primary))",
    overdue: "hsl(var(--destructive))",
  };

  return (
    <StaggerContainer className="space-y-6">
      {/* Alerts */}
      <StaggerItem>
        <InvoiceAlerts
          cards={cards}
          invoices={invoices}
          currentDate={currentDate}
        />
      </StaggerItem>

      {/* KPI Cards */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Total Expenses */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Gastos do mês
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(totalExpenses)}
                  </p>
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

          {/* Income */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Receita
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                    {formatCurrency(monthBalance.income)}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 ring-1 ring-primary/15">
                  <ArrowUpCircle className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Faturas
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
                {currentInvoices.length} {currentInvoices.length === 1 ? "cartão" : "cartões"} em {monthLabel}
              </p>
            </CardContent>
          </Card>

          {/* Balance */}
          <Card className={appCard}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Saldo
                  </p>
                  <p className={[
                    "mt-1 text-2xl font-bold tracking-tight",
                    monthBalance.balance >= 0 ? "text-foreground" : "text-destructive"
                  ].join(" ")}>
                    {formatCurrency(monthBalance.balance)}
                  </p>
                </div>
                <div className={[
                  "rounded-2xl p-3 ring-1",
                  monthBalance.balance >= 0
                    ? "bg-primary/10 ring-primary/15"
                    : "bg-destructive/10 ring-destructive/15"
                ].join(" ")}>
                  <Wallet className={[
                    "h-5 w-5",
                    monthBalance.balance >= 0 ? "text-primary" : "text-destructive"
                  ].join(" ")} />
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
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">Orçamento mensal</p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(totalExpenses)} / {formatCurrency(budget.total)}
                </p>
              </div>
              <Progress
                value={budgetPercent}
                className="h-2.5 rounded-full"
              />
              {budgetExceeded && (
                <p className="mt-2 text-xs text-destructive font-medium">
                  Orçamento excedido em {formatCurrency(totalExpenses - budget.total)}
                </p>
              )}
            </CardContent>
          </Card>
        </StaggerItem>
      )}

      {/* Cash Balance + Charts row */}
      <StaggerItem>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Cash Balance */}
          <CashBalance balance={monthBalance} className={appCard} />

          {/* Category Pie Chart */}
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
                <div className="flex items-center gap-4">
                  <div className="h-[160px] w-[160px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={categoryData}
                          dataKey="total"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          strokeWidth={0}
                        >
                          {categoryData.map((entry) => (
                            <Cell
                              key={entry.category}
                              fill={getCategoryColor(entry.category)}
                            />
                          ))}
                        </Pie>
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 space-y-1.5 overflow-auto max-h-[160px]">
                    {categoryData.map((cat) => (
                      <div key={cat.category} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getCategoryColor(cat.category) }}
                        />
                        <span className="flex-1 truncate text-foreground/80">{cat.category}</span>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Status breakdown */}
      <StaggerItem>
        <Card className={appCard}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por status</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {statusData.every((s) => s.total === 0) ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Sem dados para exibir.
              </p>
            ) : (
              <div className="h-[180px]">
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
            )}
          </CardContent>
        </Card>
      </StaggerItem>
    </StaggerContainer>
  );
}
