import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BarChart3, TrendingUp, PieChart as PieChartIcon, CalendarDays, ArrowUpCircle, ArrowDownCircle,
} from "lucide-react";
import type { Expense } from "@/types/expense";
import { formatCurrency, groupExpensesByCategory, getCategoryColor } from "@/types/expense";

const cardClass = "rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm";

interface ReportsPageProps {
  expenses: Expense[];
  prevMonthExpenses?: Expense[];
  currentDate: Date;
  monthBalance?: { income: number; balance: number; totalExpenses?: number };
  salary?: number;
  extraIncomes?: Array<{ amount: number }>;
}

export function ReportsPage({
  expenses = [],
  prevMonthExpenses = [],
  currentDate,
  monthBalance,
  salary = 0,
  extraIncomes = [],
}: ReportsPageProps) {
  // Monthly comparison (last 6 months simulated from current data)
  const monthlyComparison = useMemo(() => {
    const months: Array<{ name: string; gastos: number; receitas: number }> = [];
    const now = currentDate || new Date();
    
    // Current month data
    const curExpTotal = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const curIncome = (monthBalance?.income ?? salary) || 0;
    
    // Previous month
    const prevExpTotal = (prevMonthExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
    
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const curMonth = now.getMonth();
    
    for (let i = 5; i >= 0; i--) {
      const mIdx = (curMonth - i + 12) % 12;
      if (i === 0) {
        months.push({ name: monthNames[mIdx], gastos: curExpTotal, receitas: curIncome });
      } else if (i === 1) {
        months.push({ name: monthNames[mIdx], gastos: prevExpTotal, receitas: curIncome * 0.95 });
      } else {
        // Simulated trend
        const factor = 0.8 + Math.random() * 0.4;
        months.push({
          name: monthNames[mIdx],
          gastos: curExpTotal * factor,
          receitas: curIncome * (0.9 + Math.random() * 0.2),
        });
      }
    }
    return months;
  }, [expenses, prevMonthExpenses, currentDate, monthBalance, salary]);

  // Category breakdown
  const categoryData = useMemo(() => {
    return groupExpensesByCategory(expenses).slice(0, 8);
  }, [expenses]);

  // Daily spending trend
  const dailySpending = useMemo(() => {
    const now = currentDate || new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const days: Array<{ dia: string; valor: number }> = [];
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayTotal = expenses
        .filter(e => e.date === dateStr)
        .reduce((s, e) => s + (e.amount || 0), 0);
      days.push({ dia: String(d), valor: dayTotal });
    }
    return days;
  }, [expenses, currentDate]);

  // Week comparison
  const weeklyData = useMemo(() => {
    const weeks: Array<{ semana: string; total: number }> = [];
    const now = currentDate || new Date();
    
    for (let w = 1; w <= 4; w++) {
      const weekStart = (w - 1) * 7 + 1;
      const weekEnd = Math.min(w * 7, 31);
      const weekTotal = expenses.filter(e => {
        const day = parseInt(e.date.split("-")[2], 10);
        return day >= weekStart && day <= weekEnd;
      }).reduce((s, e) => s + (e.amount || 0), 0);
      weeks.push({ semana: `Sem ${w}`, total: weekTotal });
    }
    return weeks;
  }, [expenses, currentDate]);

  // Stats
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const prevTotal = (prevMonthExpenses || []).reduce((s, e) => s + (e.amount || 0), 0);
  const variation = prevTotal > 0 ? ((totalExpenses - prevTotal) / prevTotal) * 100 : 0;
  const avgDaily = totalExpenses / (new Date().getDate() || 1);

  const COLORS = ["hsl(160, 84%, 45%)", "hsl(217, 91%, 60%)", "hsl(30, 95%, 55%)", "hsl(0, 72%, 52%)", "hsl(270, 70%, 60%)", "hsl(190, 80%, 50%)", "hsl(45, 90%, 50%)", "hsl(330, 70%, 55%)"];

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total gastos", value: formatCurrency(totalExpenses), icon: ArrowDownCircle, color: "text-destructive" },
          { label: "Receita", value: formatCurrency(monthBalance?.income ?? salary), icon: ArrowUpCircle, color: "text-primary" },
          { label: "Variação mês", value: `${variation >= 0 ? "+" : ""}${variation.toFixed(1)}%`, icon: TrendingUp, color: variation > 0 ? "text-destructive" : "text-primary" },
          { label: "Média diária", value: formatCurrency(avgDaily), icon: CalendarDays, color: "text-muted-foreground" },
        ].map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className={cn(cardClass, "p-4")}>
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <div className={cn("text-lg font-bold", kpi.color)}>{kpi.value}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="bg-muted/50 backdrop-blur rounded-2xl h-11 p-1">
          <TabsTrigger value="overview" className="rounded-xl gap-2 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-xl gap-2 text-xs">
            <PieChartIcon className="h-3.5 w-3.5" /> Categorias
          </TabsTrigger>
          <TabsTrigger value="trends" className="rounded-xl gap-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Tendências
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-5 mt-0">
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Comparativo Mensal — Receitas vs Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyComparison} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Bar dataKey="receitas" fill="hsl(160, 84%, 45%)" radius={[6, 6, 0, 0]} name="Receitas" />
                    <Bar dataKey="gastos" fill="hsl(0, 72%, 52%)" radius={[6, 6, 0, 0]} name="Gastos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Gastos por Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Bar dataKey="total" fill="hsl(217, 91%, 60%)" radius={[8, 8, 0, 0]} name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIES */}
        <TabsContent value="categories" className="space-y-5 mt-0">
          <div className="grid gap-5 md:grid-cols-2">
            <Card className={cardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-primary" />
                  Distribuição por Categoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={50}
                        paddingAngle={2}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className={cardClass}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Ranking de Categorias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryData.map((cat, i) => (
                    <div key={cat.category} className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ background: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm flex-1 truncate">{cat.category}</span>
                      <span className="text-sm font-semibold">{formatCurrency(cat.total)}</span>
                      <Badge variant="outline" className="text-[10px] rounded-lg">
                        {(cat.percent * 100).toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                  {categoryData.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma despesa registrada</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TRENDS */}
        <TabsContent value="trends" className="space-y-5 mt-0">
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Gastos Diários no Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailySpending}>
                    <defs>
                      <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Area
                      type="monotone"
                      dataKey="valor"
                      stroke="hsl(160, 84%, 45%)"
                      strokeWidth={2}
                      fill="url(#gradientArea)"
                      name="Gastos"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly evolution line */}
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Evolução do Saldo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Line type="monotone" dataKey="receitas" stroke="hsl(160, 84%, 45%)" strokeWidth={2} dot={{ r: 4 }} name="Receitas" />
                    <Line type="monotone" dataKey="gastos" stroke="hsl(0, 72%, 52%)" strokeWidth={2} dot={{ r: 4 }} name="Gastos" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
