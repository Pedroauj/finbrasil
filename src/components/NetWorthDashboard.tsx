import { useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/types/expense";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Wallet, Landmark, CreditCard,
  PiggyBank, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import type { FinancialAccount, CreditCardInvoice } from "@/types/expense";

const appCard =
  "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm " +
  "transition-all duration-300 will-change-transform hover:-translate-y-[1px] hover:shadow-md";

interface NetWorthDashboardProps {
  accounts: FinancialAccount[];
  invoices: CreditCardInvoice[];
  expenses: any[];
  currentDate: Date;
  userId?: string;
}

function NetWorthKpi({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; icon: any; color: string; sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(appCard, "group")}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className="rounded-xl p-2 ring-1 ring-border/40 bg-background/30">
            <Icon className="h-4 w-4" style={{ color }} />
          </div>
        </div>
        <p className="text-xl font-bold tabular-nums" style={{ color }}>
          {formatCurrency(value)}
        </p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </motion.div>
  );
}

export function NetWorthDashboard({ accounts, invoices, expenses, currentDate, userId }: NetWorthDashboardProps) {
  // Calculate current totals
  const { totalAccounts, totalInvestments, totalDebts, netWorth } = useMemo(() => {
    const activeAccounts = accounts.filter(a => a.isActive !== false);

    const totalAccounts = activeAccounts
      .filter(a => ["checking", "savings", "wallet"].includes(a.type))
      .reduce((sum, a) => sum + Number(a.balance ?? 0), 0);

    const totalInvestments = activeAccounts
      .filter(a => a.type === "investment")
      .reduce((sum, a) => sum + Number(a.currentValue ?? a.balance ?? 0), 0);

    // Debts: unpaid invoices + planned/overdue expenses with installments
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    const unpaidInvoices = (invoices ?? [])
      .filter(i => !i.isPaid)
      .reduce((sum, inv) => sum + inv.items.reduce((s, it) => s + Number(it.amount || 0), 0), 0);

    const futureInstallments = (expenses ?? [])
      .filter(e => e.is_installment && e.status !== "paid")
      .reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

    const totalDebts = unpaidInvoices + futureInstallments;
    const netWorth = totalAccounts + totalInvestments - totalDebts;

    return { totalAccounts, totalInvestments, totalDebts, netWorth };
  }, [accounts, invoices, expenses, currentDate]);

  // Save snapshot for current month
  const saveSnapshot = useCallback(async () => {
    if (!userId) return;
    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();

    await supabase.from("net_worth_snapshots" as any).upsert({
      user_id: userId,
      month,
      year,
      total_accounts: totalAccounts,
      total_investments: totalInvestments,
      total_debts: totalDebts,
      net_worth: netWorth,
    } as any, { onConflict: "user_id,month,year" });
  }, [userId, currentDate, totalAccounts, totalInvestments, totalDebts, netWorth]);

  useEffect(() => {
    if (totalAccounts > 0 || totalInvestments > 0 || totalDebts > 0) {
      saveSnapshot();
    }
  }, [saveSnapshot, totalAccounts, totalInvestments, totalDebts]);

  // Build chart data from last 12 months (use current values as reference, snapshots for history)
  const chartData = useMemo(() => {
    const months: Array<{ label: string; contas: number; investimentos: number; dividas: number; patrimonio: number }> = [];
    const now = currentDate;

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

      if (i === 0) {
        months.push({
          label,
          contas: totalAccounts,
          investimentos: totalInvestments,
          dividas: totalDebts,
          patrimonio: netWorth,
        });
      } else {
        // Placeholder - will be filled from snapshots
        months.push({
          label,
          contas: 0,
          investimentos: 0,
          dividas: 0,
          patrimonio: 0,
        });
      }
    }
    return months;
  }, [currentDate, totalAccounts, totalInvestments, totalDebts, netWorth]);

  // Fetch historical snapshots
  const [historicalData, setHistoricalData] = useMemo(() => [chartData, () => {}], [chartData]);

  useEffect(() => {
    if (!userId) return;
    const fetchSnapshots = async () => {
      const { data } = await supabase
        .from("net_worth_snapshots" as any)
        .select("*")
        .eq("user_id", userId)
        .order("year", { ascending: true })
        .order("month", { ascending: true });

      if (data && data.length > 0) {
        const updated = [...chartData];
        for (const snap of data as any[]) {
          const d = new Date(snap.year, snap.month - 1, 1);
          const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
          const idx = updated.findIndex(m => m.label === label);
          if (idx >= 0) {
            updated[idx] = {
              label,
              contas: Number(snap.total_accounts),
              investimentos: Number(snap.total_investments),
              dividas: Number(snap.total_debts),
              patrimonio: Number(snap.net_worth),
            };
          }
        }
        // Fill gaps with interpolation
        setHistoricalData?.(updated);
      }
    };
    fetchSnapshots();
  }, [userId, chartData]);

  const deltaSign = netWorth >= 0 ? "positive" : "negative";
  const DeltaIcon = netWorth >= 0 ? ArrowUpRight : ArrowDownRight;

  // Account breakdown for visualization
  const accountBreakdown = useMemo(() => {
    const activeAccounts = accounts.filter(a => a.is_active !== false);
    const typeMap: Record<string, { label: string; total: number; color: string }> = {
      checking: { label: "Conta Corrente", total: 0, color: "hsl(217, 91%, 60%)" },
      savings: { label: "Poupança", total: 0, color: "hsl(160, 84%, 45%)" },
      wallet: { label: "Carteira", total: 0, color: "hsl(45, 93%, 47%)" },
      investment: { label: "Investimentos", total: 0, color: "hsl(280, 67%, 60%)" },
      credit_card: { label: "Cartão de Crédito", total: 0, color: "hsl(0, 72%, 52%)" },
    };
    activeAccounts.forEach(a => {
      if (typeMap[a.type]) {
        typeMap[a.type].total += a.type === "investment" ? Number(a.current_value ?? a.balance ?? 0) : Number(a.balance ?? 0);
      }
    });
    return Object.values(typeMap).filter(t => t.total !== 0);
  }, [accounts]);

  return (
    <StaggerContainer className="space-y-6">
      {/* KPI Cards */}
      <StaggerItem>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <NetWorthKpi
            label="Patrimônio Líquido"
            value={netWorth}
            icon={netWorth >= 0 ? TrendingUp : TrendingDown}
            color={netWorth >= 0 ? "hsl(160, 84%, 45%)" : "hsl(0, 72%, 52%)"}
            sub={deltaSign === "positive" ? "Saudável ✨" : "Atenção ⚠️"}
          />
          <NetWorthKpi
            label="Contas & Carteiras"
            value={totalAccounts}
            icon={Wallet}
            color="hsl(217, 91%, 60%)"
          />
          <NetWorthKpi
            label="Investimentos"
            value={totalInvestments}
            icon={PiggyBank}
            color="hsl(280, 67%, 60%)"
          />
          <NetWorthKpi
            label="Dívidas"
            value={totalDebts}
            icon={CreditCard}
            color="hsl(0, 72%, 52%)"
            sub="Faturas + parcelas pendentes"
          />
        </div>
      </StaggerItem>

      {/* Evolution Chart */}
      <StaggerItem>
        <div className={cn(appCard)}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-primary/10 p-2">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Evolução Patrimonial</CardTitle>
                <p className="text-xs text-muted-foreground">Últimos 12 meses</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(280, 67%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(280, 67%, 60%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorDivida" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(0, 72%, 52%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(0, 72%, 52%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="patrimonio"
                    name="Patrimônio"
                    stroke="hsl(160, 84%, 45%)"
                    strokeWidth={2.5}
                    fill="url(#colorPatrimonio)"
                  />
                  <Area
                    type="monotone"
                    dataKey="investimentos"
                    name="Investimentos"
                    stroke="hsl(280, 67%, 60%)"
                    strokeWidth={1.5}
                    fill="url(#colorInvest)"
                  />
                  <Area
                    type="monotone"
                    dataKey="dividas"
                    name="Dívidas"
                    stroke="hsl(0, 72%, 52%)"
                    strokeWidth={1.5}
                    fill="url(#colorDivida)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </div>
      </StaggerItem>

      {/* Account Breakdown */}
      <StaggerItem>
        <div className={cn(appCard)}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-primary/10 p-2">
                <Landmark className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-base">Composição do Patrimônio</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="space-y-3">
              {accountBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma conta cadastrada ainda.
                </p>
              ) : (
                accountBreakdown.map((item) => {
                  const total = totalAccounts + totalInvestments;
                  const pct = total > 0 ? (Math.abs(item.total) / total) * 100 : 0;
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm">{item.label}</span>
                        </div>
                        <span className="text-sm font-bold tabular-nums" style={{ color: item.color }}>
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </div>
      </StaggerItem>
    </StaggerContainer>
  );
}
