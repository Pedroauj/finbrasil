import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Calculator, AlertTriangle, Layers, CreditCard, Calendar,
  TrendingUp, DollarSign, ChevronRight, Sparkles,
} from "lucide-react";
import { formatCurrency } from "@/types/expense";
import type { Expense } from "@/types/expense";

const cardClass = "rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm";

interface InstallmentManagerProps {
  expenses: Expense[];
  allExpenses: Expense[];
  currentDate: Date;
  monthBalance?: { income: number; balance: number };
}

function pad2(n: number) { return String(n).padStart(2, "0"); }

interface InstallmentGroup {
  parentId: string;
  description: string;
  category: string;
  totalAmount: number;
  installmentCount: number;
  perInstallment: number;
  paidCount: number;
  remainingCount: number;
  remainingTotal: number;
  items: Expense[];
}

export function InstallmentManager({
  expenses = [],
  allExpenses = [],
  currentDate,
  monthBalance,
}: InstallmentManagerProps) {
  // ─── Simulator state ───
  const [simAmount, setSimAmount] = useState("");
  const [simInstallments, setSimInstallments] = useState([6]);
  const [simResult, setSimResult] = useState<{
    perMonth: number; total: number; months: Array<{ label: string; amount: number; accumulated: number }>;
  } | null>(null);

  // ─── Group installments ───
  const installmentGroups = useMemo<InstallmentGroup[]>(() => {
    const installmentExpenses = allExpenses.filter(e => e.isInstallment);
    const groupMap = new Map<string, Expense[]>();

    installmentExpenses.forEach(e => {
      const key = e.parentInstallmentId || e.id;
      const arr = groupMap.get(key) || [];
      arr.push(e);
      groupMap.set(key, arr);
    });

    const groups: InstallmentGroup[] = [];
    groupMap.forEach((items, parentId) => {
      const sorted = items.sort((a, b) => (a.currentInstallment || 0) - (b.currentInstallment || 0));
      const first = sorted[0];
      const totalCount = first.installmentCount || items.length;
      const perInstallment = first.amount;
      const paidItems = sorted.filter(e => e.status === "paid");
      const remaining = sorted.filter(e => e.status !== "paid");

      groups.push({
        parentId,
        description: first.description.replace(/\s*\(\d+\/\d+\)\s*$/, ""),
        category: first.category,
        totalAmount: perInstallment * totalCount,
        installmentCount: totalCount,
        perInstallment,
        paidCount: paidItems.length,
        remainingCount: remaining.length,
        remainingTotal: remaining.reduce((s, e) => s + e.amount, 0),
        items: sorted,
      });
    });

    return groups.sort((a, b) => b.remainingTotal - a.remainingTotal);
  }, [allExpenses]);

  // ─── Alerts ───
  const alerts = useMemo(() => {
    const now = currentDate || new Date();
    const warnings: Array<{ type: "high_commitment" | "concentration" | "long_term"; message: string; severity: "warning" | "danger" }> = [];

    const income = monthBalance?.income || 0;

    // Total committed with installments this month
    const thisMonthInstallments = expenses.filter(e => e.isInstallment);
    const totalInstallmentThisMonth = thisMonthInstallments.reduce((s, e) => s + e.amount, 0);

    if (income > 0) {
      const ratio = totalInstallmentThisMonth / income;
      if (ratio > 0.3) {
        warnings.push({
          type: "high_commitment",
          message: `${(ratio * 100).toFixed(0)}% da sua receita está comprometida com parcelas este mês (${formatCurrency(totalInstallmentThisMonth)})`,
          severity: ratio > 0.5 ? "danger" : "warning",
        });
      }
    }

    // Check if too many installment groups
    const activeGroups = installmentGroups.filter(g => g.remainingCount > 0);
    if (activeGroups.length > 5) {
      warnings.push({
        type: "concentration",
        message: `Você possui ${activeGroups.length} séries de parcelas ativas simultaneamente. Cuidado com o acúmulo!`,
        severity: activeGroups.length > 8 ? "danger" : "warning",
      });
    }

    // Long-term commitments (>6 months remaining)
    const longTerm = activeGroups.filter(g => g.remainingCount > 6);
    if (longTerm.length > 0) {
      const total = longTerm.reduce((s, g) => s + g.remainingTotal, 0);
      warnings.push({
        type: "long_term",
        message: `${longTerm.length} parcela(s) com mais de 6 meses restantes, totalizando ${formatCurrency(total)} comprometidos`,
        severity: "warning",
      });
    }

    return warnings;
  }, [expenses, installmentGroups, monthBalance, currentDate]);

  // ─── Simulator ───
  const runSimulation = () => {
    const amount = parseFloat(simAmount.replace(",", "."));
    if (!amount || amount <= 0) return;

    const count = simInstallments[0];
    const perMonth = Math.round((amount / count) * 100) / 100;
    const now = currentDate || new Date();

    const months: Array<{ label: string; amount: number; accumulated: number }> = [];
    let acc = 0;
    for (let i = 0; i < count; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      acc += perMonth;
      months.push({
        label: `${names[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        amount: perMonth,
        accumulated: acc,
      });
    }

    setSimResult({ perMonth, total: amount, months });
  };

  // ─── Future months impact ───
  const futureImpact = useMemo(() => {
    const now = currentDate || new Date();
    const monthsAhead: Array<{ label: string; total: number }> = [];
    const names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();

      const total = allExpenses
        .filter(e => {
          if (!e.isInstallment) return false;
          const [ey, em] = e.date.split("-").map(Number);
          return ey === y && em === m && e.status !== "paid";
        })
        .reduce((s, e) => s + e.amount, 0);

      monthsAhead.push({
        label: `${names[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        total,
      });
    }

    return monthsAhead;
  }, [allExpenses, currentDate]);

  const activeGroups = installmentGroups.filter(g => g.remainingCount > 0);
  const totalRemaining = activeGroups.reduce((s, g) => s + g.remainingTotal, 0);

  return (
    <div className="space-y-6">
      {/* Alerts */}
      <AnimatePresence>
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {alerts.map((alert, i) => (
              <Card key={i} className={cn(
                cardClass, "p-4 border-l-4",
                alert.severity === "danger" ? "border-l-destructive" : "border-l-yellow-500"
              )}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className={cn(
                    "h-5 w-5 shrink-0 mt-0.5",
                    alert.severity === "danger" ? "text-destructive" : "text-yellow-500"
                  )} />
                  <p className="text-sm">{alert.message}</p>
                </div>
              </Card>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Séries ativas", value: String(activeGroups.length), icon: Layers, color: "text-primary" },
          { label: "Total restante", value: formatCurrency(totalRemaining), icon: DollarSign, color: "text-destructive" },
          { label: "Parcelas este mês", value: formatCurrency(expenses.filter(e => e.isInstallment).reduce((s, e) => s + e.amount, 0)), icon: Calendar, color: "text-muted-foreground" },
          { label: "Comprometimento", value: monthBalance?.income ? `${((expenses.filter(e => e.isInstallment).reduce((s, e) => s + e.amount, 0) / monthBalance.income) * 100).toFixed(0)}%` : "—", icon: TrendingUp, color: "text-primary" },
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
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="groups" className="space-y-5">
        <TabsList className="bg-muted/50 backdrop-blur rounded-2xl h-11 p-1">
          <TabsTrigger value="groups" className="rounded-xl gap-2 text-xs">
            <Layers className="h-3.5 w-3.5" /> Parcelas Ativas
          </TabsTrigger>
          <TabsTrigger value="simulator" className="rounded-xl gap-2 text-xs">
            <Calculator className="h-3.5 w-3.5" /> Simulador
          </TabsTrigger>
          <TabsTrigger value="impact" className="rounded-xl gap-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Impacto Futuro
          </TabsTrigger>
        </TabsList>

        {/* Active installment groups */}
        <TabsContent value="groups" className="mt-0">
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-3">
              {activeGroups.length === 0 ? (
                <Card className={cn(cardClass, "p-8 text-center")}>
                  <CreditCard className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma parcela ativa no momento</p>
                </Card>
              ) : (
                activeGroups.map((group, i) => (
                  <motion.div
                    key={group.parentId}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Card className={cn(cardClass, "p-4")}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-semibold">{group.description}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-[10px]">{group.category}</Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {group.paidCount}/{group.installmentCount} pagas
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">{formatCurrency(group.perInstallment)}/mês</div>
                            <div className="text-[11px] text-muted-foreground">
                              Total: {formatCurrency(group.totalAmount)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Progresso</span>
                            <span>{((group.paidCount / group.installmentCount) * 100).toFixed(0)}%</span>
                          </div>
                          <Progress
                            value={(group.paidCount / group.installmentCount) * 100}
                            className="h-2"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Restam {group.remainingCount} parcelas
                          </span>
                          <span className="font-semibold text-destructive">
                            {formatCurrency(group.remainingTotal)} restantes
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Simulator */}
        <TabsContent value="simulator" className="mt-0">
          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Simulador de Parcelas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Valor total da compra</Label>
                  <Input
                    type="text"
                    placeholder="R$ 0,00"
                    value={simAmount}
                    onChange={e => setSimAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Número de parcelas: {simInstallments[0]}x</Label>
                  <Slider
                    min={2}
                    max={48}
                    step={1}
                    value={simInstallments}
                    onValueChange={setSimInstallments}
                    className="mt-3"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>2x</span>
                    <span>12x</span>
                    <span>24x</span>
                    <span>48x</span>
                  </div>
                </div>
              </div>

              <Button onClick={runSimulation} className="w-full gap-2">
                <Calculator className="h-4 w-4" />
                Simular
              </Button>

              <AnimatePresence>
                {simResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Result KPIs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border/50 bg-muted/30 p-3 text-center">
                        <div className="text-[11px] text-muted-foreground mb-1">Valor por parcela</div>
                        <div className="text-lg font-bold text-primary">{formatCurrency(simResult.perMonth)}</div>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-muted/30 p-3 text-center">
                        <div className="text-[11px] text-muted-foreground mb-1">Comprometimento mensal</div>
                        <div className={cn(
                          "text-lg font-bold",
                          monthBalance?.income && (simResult.perMonth / monthBalance.income) > 0.2
                            ? "text-destructive" : "text-primary"
                        )}>
                          {monthBalance?.income
                            ? `${((simResult.perMonth / monthBalance.income) * 100).toFixed(1)}%`
                            : "—"
                          }
                        </div>
                      </div>
                    </div>

                    {/* Impact warning */}
                    {monthBalance?.income && (simResult.perMonth / monthBalance.income) > 0.15 && (
                      <div className="flex items-start gap-2 rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-3">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          Essa parcela representaria{" "}
                          <strong className="text-foreground">
                            {((simResult.perMonth / monthBalance.income) * 100).toFixed(1)}%
                          </strong>{" "}
                          da sua receita mensal. Considere um parcelamento maior ou avalie se é essencial.
                        </p>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                      {simResult.months.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-16 text-muted-foreground">{m.label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(m.accumulated / simResult.total) * 100}%` }}
                            />
                          </div>
                          <span className="w-20 text-right font-medium">{formatCurrency(m.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Future Impact */}
        <TabsContent value="impact" className="mt-0">
          <Card className={cardClass}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Impacto nos Próximos 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {futureImpact.map((month, i) => {
                  const maxTotal = Math.max(...futureImpact.map(m => m.total), 1);
                  const pct = (month.total / maxTotal) * 100;
                  return (
                    <motion.div
                      key={month.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">{month.label}</span>
                        <span className={cn(
                          "font-semibold",
                          month.total > 0 ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {month.total > 0 ? formatCurrency(month.total) : "Livre"}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-destructive/70"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: i * 0.05 + 0.2, duration: 0.4 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {monthBalance?.income && (
                <div className="mt-4 rounded-xl border border-border/50 bg-muted/30 p-3">
                  <div className="text-[11px] text-muted-foreground mb-1">Comprometimento médio futuro</div>
                  <div className="text-sm font-bold">
                    {((futureImpact.reduce((s, m) => s + m.total, 0) / futureImpact.length / monthBalance.income) * 100).toFixed(1)}% da receita
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
