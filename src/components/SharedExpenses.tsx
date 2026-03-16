import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Split, ArrowRightLeft, Trash2, Loader2,
  TrendingUp, ChevronDown, ChevronUp, Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const appCard = "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm";

interface SharedExpense {
  id: string;
  expense_id: string;
  group_id: string;
  created_by: string;
  split_type: string;
  splits: Array<{ user_id: string; percentage: number; amount: number }>;
  created_at: string;
  expense?: {
    description: string;
    amount: number;
    date: string;
    category: string;
  };
  creator_name?: string;
}

interface MemberIncome {
  user_id: string;
  display_name: string;
  total_income: number;
}

interface SharedExpensesProps {
  userId: string;
  groupId: string;
  groupName: string;
  members: Array<{ user_id: string; display_name?: string }>;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SharedExpenses({ userId, groupId, groupName, members }: SharedExpensesProps) {
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [memberIncomes, setMemberIncomes] = useState<MemberIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const fetchSharedExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const [year, month] = filterMonth.split("-").map(Number);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

      // Fetch shared expenses for this group
      const { data: shared } = await supabase
        .from("shared_expenses")
        .select("*")
        .eq("group_id", groupId);

      if (!shared || shared.length === 0) {
        setSharedExpenses([]);
        setLoading(false);
        return;
      }

      // Fetch the actual expenses
      const expenseIds = shared.map((s: any) => s.expense_id);
      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, description, amount, date, category")
        .in("id", expenseIds)
        .gte("date", startDate)
        .lt("date", endDate);

      const expenseMap = new Map((expenses ?? []).map(e => [e.id, e]));

      // Fetch creator names
      const creatorIds = [...new Set(shared.map((s: any) => s.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", creatorIds);

      const nameMap = new Map((profiles ?? []).map(p => [p.user_id, p.display_name]));

      const enriched = shared
        .map((s: any) => ({
          ...s,
          splits: typeof s.splits === "string" ? JSON.parse(s.splits) : s.splits,
          expense: expenseMap.get(s.expense_id),
          creator_name: nameMap.get(s.created_by) ?? "Usuário",
        }))
        .filter((s: any) => s.expense) // Only show expenses in the selected month
        .sort((a: any, b: any) => (b.expense?.date ?? "").localeCompare(a.expense?.date ?? ""));

      setSharedExpenses(enriched);
    } catch (err) {
      console.error("Error fetching shared expenses:", err);
    }
    setLoading(false);
  }, [groupId, filterMonth]);

  const fetchMemberIncomes = useCallback(async () => {
    const [year, month] = filterMonth.split("-").map(Number);
    const memberIds = members.map(m => m.user_id);

    // Fetch salaries for members
    const { data: salaries } = await supabase
      .from("salaries")
      .select("user_id, amount")
      .in("user_id", memberIds)
      .eq("month", month)
      .eq("year", year);

    // Fetch extra incomes
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const { data: extras } = await supabase
      .from("extra_incomes")
      .select("user_id, amount")
      .in("user_id", memberIds)
      .gte("date", startDate)
      .lt("date", endDate);

    const incomeMap = new Map<string, number>();
    (salaries ?? []).forEach((s: any) => {
      incomeMap.set(s.user_id, (incomeMap.get(s.user_id) ?? 0) + Number(s.amount));
    });
    (extras ?? []).forEach((e: any) => {
      incomeMap.set(e.user_id, (incomeMap.get(e.user_id) ?? 0) + Number(e.amount));
    });

    setMemberIncomes(
      members.map(m => ({
        user_id: m.user_id,
        display_name: m.display_name ?? "Usuário",
        total_income: incomeMap.get(m.user_id) ?? 0,
      }))
    );
  }, [members, filterMonth]);

  useEffect(() => {
    fetchSharedExpenses();
    fetchMemberIncomes();
  }, [fetchSharedExpenses, fetchMemberIncomes]);

  const totalGroupIncome = useMemo(
    () => memberIncomes.reduce((s, m) => s + m.total_income, 0),
    [memberIncomes]
  );

  // Calculate balances: who owes whom
  const balances = useMemo(() => {
    const owes = new Map<string, number>(); // user_id -> net amount (positive = they owe, negative = owed to them)
    members.forEach(m => owes.set(m.user_id, 0));

    sharedExpenses.forEach(se => {
      if (!se.expense) return;
      const totalAmount = se.expense.amount;
      const creatorId = se.created_by;

      // Creator paid the full amount
      owes.set(creatorId, (owes.get(creatorId) ?? 0) - totalAmount);

      // Each person owes their split
      (se.splits ?? []).forEach(split => {
        owes.set(split.user_id, (owes.get(split.user_id) ?? 0) + split.amount);
      });
    });

    return owes;
  }, [sharedExpenses, members]);

  const removeSharedExpense = async (id: string) => {
    const { error } = await supabase
      .from("shared_expenses")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover compartilhamento.");
      return;
    }
    toast.success("Compartilhamento removido.");
    fetchSharedExpenses();
  };

  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = format(d, "MMMM yyyy", { locale: ptBR });
      opts.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return opts;
  }, []);

  const totalShared = useMemo(
    () => sharedExpenses.reduce((s, se) => s + (se.expense?.amount ?? 0), 0),
    [sharedExpenses]
  );

  const myShare = useMemo(
    () => sharedExpenses.reduce((s, se) => {
      const split = (se.splits ?? []).find(sp => sp.user_id === userId);
      return s + (split?.amount ?? 0);
    }, 0),
    [sharedExpenses, userId]
  );

  return (
    <div className={cn(appCard, "overflow-hidden")}>
      {/* Header */}
      <button
        className="w-full p-5 border-b border-border/40 flex items-center justify-between hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Split className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold">Despesas Compartilhadas</h3>
            <p className="text-xs text-muted-foreground">{groupName}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {sharedExpenses.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {sharedExpenses.length} despesa{sharedExpenses.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-5">
              {/* Month filter */}
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-48 rounded-xl h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Income distribution */}
              {totalGroupIncome > 0 && (
                <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Distribuição de Renda</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {memberIncomes.map(m => {
                      const pct = totalGroupIncome > 0 ? (m.total_income / totalGroupIncome) * 100 : 0;
                      return (
                        <div key={m.user_id} className="rounded-xl border border-border/30 bg-background/50 p-3">
                          <p className="text-xs font-medium truncate">{m.display_name}</p>
                          <p className="text-sm font-bold tabular-nums mt-1">{fmt(m.total_income)}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Summary cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border/40 bg-background/50 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Compartilhado</p>
                  <p className="text-lg font-bold tabular-nums mt-1">{fmt(totalShared)}</p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-background/50 p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sua Parte</p>
                  <p className="text-lg font-bold tabular-nums mt-1">{fmt(myShare)}</p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-background/50 p-4 col-span-2 sm:col-span-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Saldo</p>
                  {(() => {
                    const netBalance = balances.get(userId) ?? 0;
                    return (
                      <p className={cn(
                        "text-lg font-bold tabular-nums mt-1",
                        netBalance > 0.01 ? "text-destructive" : netBalance < -0.01 ? "text-emerald-500" : "text-foreground"
                      )}>
                        {netBalance > 0.01 ? `Você deve ${fmt(netBalance)}` : netBalance < -0.01 ? `Devem a você ${fmt(Math.abs(netBalance))}` : "Tudo certo ✓"}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Balance between members */}
              {members.length >= 2 && (
                <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold">Balanço entre Membros</span>
                  </div>
                  {members.map(m => {
                    const bal = balances.get(m.user_id) ?? 0;
                    const name = m.display_name ?? "Usuário";
                    const isSelf = m.user_id === userId;
                    return (
                      <div key={m.user_id} className="flex items-center justify-between rounded-xl bg-background/50 border border-border/30 p-3">
                        <span className="text-xs font-medium">
                          {name} {isSelf && <span className="text-muted-foreground">(você)</span>}
                        </span>
                        <span className={cn(
                          "text-xs font-bold tabular-nums",
                          bal > 0.01 ? "text-destructive" : bal < -0.01 ? "text-emerald-500" : "text-muted-foreground"
                        )}>
                          {bal > 0.01 ? `Deve ${fmt(bal)}` : bal < -0.01 ? `A receber ${fmt(Math.abs(bal))}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Shared expenses list */}
              {loading ? (
                <div className="py-8 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : sharedExpenses.length === 0 ? (
                <div className="py-8 text-center">
                  <Split className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Nenhuma despesa compartilhada neste mês.
                  </p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    Ao criar um gasto, ative "Despesa compartilhada" para dividir com o grupo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sharedExpenses.map(se => (
                    <div key={se.id} className="rounded-xl border border-border/40 bg-background/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{se.expense?.description}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {se.split_type === "proportional" ? "Proporcional" : "Igualitário"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {se.expense?.date ? (() => { const [y, m, d] = se.expense.date.split("-").map(Number); return format(new Date(y, m - 1, d), "dd/MM"); })() : ""}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">{se.expense?.category}</span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs font-medium">{fmt(se.expense?.amount ?? 0)}</span>
                          </div>
                          {/* Splits */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(se.splits ?? []).map(sp => {
                              const member = members.find(m => m.user_id === sp.user_id);
                              const name = member?.display_name ?? "Usuário";
                              const isSelf = sp.user_id === userId;
                              return (
                                <span
                                  key={sp.user_id}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-medium",
                                    isSelf ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {name}: {fmt(sp.amount)} ({sp.percentage.toFixed(0)}%)
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {se.created_by === userId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-destructive shrink-0"
                            onClick={() => removeSharedExpense(se.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
