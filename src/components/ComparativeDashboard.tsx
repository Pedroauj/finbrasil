import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, BarChart3, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/types/expense";
import type { Expense } from "@/types/expense";

const cardClass = "rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm";

interface ComparativeDashboardProps {
  allExpenses: Expense[];
  allSalaries: Array<{ month: number; year: number; amount: number }>;
  allExtraIncomes: Array<{ id: string; date: string; amount: number }>;
  currentDate: Date;
  monthStartDay?: number;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

function getMonthLabel(m: number, y: number) {
  const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${names[m - 1]}/${String(y).slice(2)}`;
}

export function ComparativeDashboard({
  allExpenses = [],
  allSalaries = [],
  allExtraIncomes = [],
  currentDate,
  monthStartDay = 1,
}: ComparativeDashboardProps) {

  // Build monthly data for last 12 months
  const monthlyData = useMemo(() => {
    const now = currentDate || new Date();
    const months: Array<{
      key: string; label: string; month: number; year: number;
      gastos: number; receitas: number; saldo: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const key = `${y}-${pad2(m)}`;

      // Expenses for this month
      const gastos = allExpenses
        .filter(e => {
          const [ey, em] = e.date.split("-").map(Number);
          return ey === y && em === m;
        })
        .reduce((s, e) => s + (e.amount || 0), 0);

      // Income: salary + extra incomes
      const salaryAmt = allSalaries.find(s => s.month === m && s.year === y)?.amount || 0;
      const extraAmt = allExtraIncomes
        .filter(e => {
          const [ey, em] = e.date.split("-").map(Number);
          return ey === y && em === m;
        })
        .reduce((s, e) => s + e.amount, 0);

      const receitas = salaryAmt + extraAmt;

      months.push({
        key, label: getMonthLabel(m, y), month: m, year: y,
        gastos, receitas, saldo: receitas - gastos,
      });
    }
    return months;
  }, [allExpenses, allSalaries, allExtraIncomes, currentDate]);

  // KPIs
  const stats = useMemo(() => {
    const withData = monthlyData.filter(m => m.gastos > 0 || m.receitas > 0);
    if (withData.length < 2) return null;

    const current = withData[withData.length - 1];
    const prev = withData[withData.length - 2];
    const avgGastos = withData.reduce((s, m) => s + m.gastos, 0) / withData.length;
    const avgReceitas = withData.reduce((s, m) => s + m.receitas, 0) / withData.length;
    const gastosVariation = prev.gastos > 0 ? ((current.gastos - prev.gastos) / prev.gastos) * 100 : 0;
    const receitasVariation = prev.receitas > 0 ? ((current.receitas - prev.receitas) / prev.receitas) * 100 : 0;

    // Trend: compare last 3 months avg vs previous 3 months avg
    const last3 = withData.slice(-3);
    const prev3 = withData.slice(-6, -3);
    const trendGastos = prev3.length > 0
      ? ((last3.reduce((s, m) => s + m.gastos, 0) / last3.length) - (prev3.reduce((s, m) => s + m.gastos, 0) / prev3.length))
      : 0;

    return { current, prev, avgGastos, avgReceitas, gastosVariation, receitasVariation, trendGastos };
  }, [monthlyData]);

  // Cumulative savings
  const cumulativeData = useMemo(() => {
    let acc = 0;
    return monthlyData.map(m => {
      acc += m.saldo;
      return { ...m, acumulado: acc };
    });
  }, [monthlyData]);

  const tooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 12,
    fontSize: 12,
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              label: "Gastos (mês atual)",
              value: formatCurrency(stats.current.gastos),
              delta: stats.gastosVariation,
              icon: ArrowDownRight,
              color: "text-destructive",
            },
            {
              label: "Receita (mês atual)",
              value: formatCurrency(stats.current.receitas),
              delta: stats.receitasVariation,
              icon: ArrowUpRight,
              color: "text-primary",
            },
            {
              label: "Média mensal gastos",
              value: formatCurrency(stats.avgGastos),
              icon: BarChart3,
              color: "text-muted-foreground",
            },
            {
              label: "Tendência",
              value: stats.trendGastos > 0 ? "Gastos subindo" : stats.trendGastos < 0 ? "Gastos caindo" : "Estável",
              icon: stats.trendGastos > 0 ? TrendingUp : TrendingDown,
              color: stats.trendGastos > 0 ? "text-destructive" : "text-primary",
            },
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
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
                </div>
                <div className={cn("text-lg font-bold", kpi.color)}>{kpi.value}</div>
                {"delta" in kpi && kpi.delta !== undefined && (
                  <span className={cn("text-[11px]", (kpi.delta as number) > 0 ? "text-destructive" : "text-primary")}>
                    {(kpi.delta as number) > 0 ? "+" : ""}{(kpi.delta as number).toFixed(1)}% vs mês anterior
                  </span>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Tabs defaultValue="evolution" className="space-y-5">
        <TabsList className="bg-muted/50 backdrop-blur rounded-2xl h-11 p-1">
          <TabsTrigger value="evolution" className="rounded-xl gap-2 text-xs">
            <Activity className="h-3.5 w-3.5" /> Evolução
          </TabsTrigger>
          <TabsTrigger value="comparison" className="rounded-xl gap-2 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Comparativo
          </TabsTrigger>
          <TabsTrigger value="savings" className="rounded-xl gap-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Acúmulo
          </TabsTrigger>
        </TabsList>

        {/* Evolution */}
        <TabsContent value="evolution" className="space-y-5 mt-0">
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Evolução — Receitas vs Gastos (12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="receitas" stroke="hsl(160, 84%, 45%)" strokeWidth={2.5} dot={{ r: 4 }} name="Receitas" />
                    <Line type="monotone" dataKey="gastos" stroke="hsl(0, 72%, 52%)" strokeWidth={2.5} dot={{ r: 4 }} name="Gastos" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Saldo mensal */}
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Saldo Mensal (Receita − Gastos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="saldo" name="Saldo" radius={[6, 6, 0, 0]}>
                      {monthlyData.map((entry, i) => (
                        <rect key={i} fill={entry.saldo >= 0 ? "hsl(160, 84%, 45%)" : "hsl(0, 72%, 52%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison - bar chart side by side */}
        <TabsContent value="comparison" className="space-y-5 mt-0">
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Comparativo Mensal — Receitas vs Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="receitas" fill="hsl(160, 84%, 45%)" radius={[6, 6, 0, 0]} name="Receitas" />
                    <Bar dataKey="gastos" fill="hsl(0, 72%, 52%)" radius={[6, 6, 0, 0]} name="Gastos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Monthly ranking */}
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ranking Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...monthlyData]
                  .filter(m => m.gastos > 0)
                  .sort((a, b) => b.gastos - a.gastos)
                  .slice(0, 6)
                  .map((m, i) => (
                    <div key={m.key} className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] rounded-lg w-6 h-6 flex items-center justify-center p-0">
                        {i + 1}
                      </Badge>
                      <span className="text-sm flex-1">{m.label}</span>
                      <span className="text-sm font-semibold text-destructive">{formatCurrency(m.gastos)}</span>
                      <span className="text-sm font-semibold text-primary">{formatCurrency(m.receitas)}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Savings / Cumulative */}
        <TabsContent value="savings" className="space-y-5 mt-0">
          <Card className={cardClass}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Saldo Acumulado (12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => formatCurrency(v)} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Area
                      type="monotone" dataKey="acumulado"
                      stroke="hsl(160, 84%, 45%)" strokeWidth={2.5}
                      fill="url(#gradCumulative)" name="Acumulado"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
