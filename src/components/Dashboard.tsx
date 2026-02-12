import { useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Wallet, DollarSign, Target } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Expense, formatCurrency, getCategoryColor, CreditCard, CreditCardInvoice } from "@/types/expense";
import { Budget } from "@/types/expense";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format, startOfWeek, endOfWeek, eachWeekOfInterval, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InvoiceAlerts } from "./InvoiceAlerts";

interface DashboardProps {
  expenses: Expense[];
  budget: Budget;
  prevMonthExpenses: Expense[];
  currentDate: Date;
  cards?: CreditCard[];
  invoices?: CreditCardInvoice[];
}

export function Dashboard({ expenses, budget, prevMonthExpenses, currentDate, cards = [], invoices = [] }: DashboardProps) {
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const prevTotal = prevMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = budget.total - totalSpent;
  const percentUsed = budget.total > 0 ? Math.min((totalSpent / budget.total) * 100, 100) : 0;
  const overBudget = totalSpent > budget.total && budget.total > 0;
  const nearBudget = percentUsed >= 80 && !overBudget;

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(e => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value, color: getCategoryColor(name) }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const weeklyData = useMemo(() => {
    const mStart = startOfMonth(currentDate);
    const mEnd = endOfMonth(currentDate);
    const weeks = eachWeekOfInterval({ start: mStart, end: mEnd }, { weekStartsOn: 1 });
    return weeks.map((weekStart, i) => {
      const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const total = expenses
        .filter(e => {
          const d = new Date(e.date);
          return d >= weekStart && d <= wEnd;
        })
        .reduce((s, e) => s + e.amount, 0);
      return { name: `Sem ${i + 1}`, total };
    });
  }, [expenses, currentDate]);

  const statusColor = overBudget ? "text-destructive" : nearBudget ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]";
  const progressColor = overBudget ? "bg-destructive" : nearBudget ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--success))]";

  return (
    <div className="space-y-6">
      {/* Alertas de Cartão de Crédito */}
      <InvoiceAlerts cards={cards} invoices={invoices} currentDate={currentDate} />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Gasto</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
                {prevTotal > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {totalSpent > prevTotal ? (
                      <TrendingUp className="h-3 w-3 text-destructive" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-[hsl(var(--success))]" />
                    )}
                    <span className={totalSpent > prevTotal ? "text-destructive" : "text-[hsl(var(--success))]"}>
                      {Math.abs(((totalSpent - prevTotal) / prevTotal) * 100).toFixed(0)}% vs mês anterior
                    </span>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Orçamento Restante</p>
                <p className={`text-2xl font-bold ${statusColor}`}>
                  {budget.total > 0 ? formatCurrency(remaining) : "Não definido"}
                </p>
              </div>
              <div className={`rounded-xl p-3 ${overBudget ? "bg-destructive/10" : nearBudget ? "bg-[hsl(var(--warning))]/10" : "bg-[hsl(var(--success))]/10"}`}>
                {overBudget ? <AlertTriangle className="h-6 w-6 text-destructive" /> : <Wallet className="h-6 w-6" style={{ color: nearBudget ? "hsl(var(--warning))" : "hsl(var(--success))" }} />}
              </div>
            </div>
            {budget.total > 0 && (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>{percentUsed.toFixed(0)}% usado</span>
                  <span>{formatCurrency(budget.total)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full transition-all ${progressColor}`} style={{ width: `${Math.min(percentUsed, 100)}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nº de Gastos</p>
                <p className="text-2xl font-bold">{expenses.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Média: {expenses.length > 0 ? formatCurrency(totalSpent / expenses.length) : "R$ 0,00"}
                </p>
              </div>
              <div className="rounded-xl bg-accent/10 p-3">
                <Target className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Orçamento */}
      {(overBudget || nearBudget) && budget.total > 0 && (
        <div className={`flex items-center gap-3 rounded-xl p-4 ${overBudget ? "bg-destructive/10 text-destructive" : "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]"}`}>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">
            {overBudget
              ? `Você ultrapassou o orçamento em ${formatCurrency(Math.abs(remaining))}!`
              : `Atenção: Você já usou ${percentUsed.toFixed(0)}% do orçamento.`}
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Sem dados para exibir</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={2}>
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 text-sm">
                  {categoryData.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="ml-auto font-medium">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Gastos por Semana</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.every(w => w.total === 0) ? (
              <p className="py-12 text-center text-muted-foreground">Sem dados para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${v}`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
