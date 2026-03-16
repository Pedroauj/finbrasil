import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Split, Percent } from "lucide-react";
import { cn } from "@/lib/utils";

interface FamilyGroup {
  id: string;
  name: string;
}

interface MemberIncome {
  user_id: string;
  display_name: string;
  total_income: number;
}

export interface ShareConfig {
  enabled: boolean;
  groupId: string;
  splitType: "proportional" | "equal";
  splits: Array<{ user_id: string; percentage: number; amount: number }>;
}

interface ExpenseShareToggleProps {
  userId: string;
  amount: number;
  currentDate: Date;
  onShareChange: (config: ShareConfig) => void;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ExpenseShareToggle({ userId, amount, currentDate, onShareChange }: ExpenseShareToggleProps) {
  const [enabled, setEnabled] = useState(false);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [splitType, setSplitType] = useState<"proportional" | "equal">("proportional");
  const [members, setMembers] = useState<MemberIncome[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch user's family groups
  useEffect(() => {
    async function fetchGroups() {
      const { data: memberOf } = await supabase
        .from("family_members")
        .select("group_id")
        .eq("user_id", userId);

      const groupIds = (memberOf ?? []).map((m: any) => m.group_id);
      if (groupIds.length === 0) return;

      const { data } = await supabase
        .from("family_groups")
        .select("id, name")
        .in("id", groupIds);

      setGroups((data ?? []) as FamilyGroup[]);
      if (data && data.length > 0) {
        setSelectedGroup((data[0] as any).id);
      }
    }
    fetchGroups();
  }, [userId]);

  // Fetch members + incomes when group changes
  useEffect(() => {
    if (!selectedGroup || !enabled) return;

    async function fetchMembers() {
      setLoading(true);
      const { data: groupMembers } = await supabase
        .from("family_members")
        .select("user_id")
        .eq("group_id", selectedGroup);

      const memberIds = (groupMembers ?? []).map((m: any) => m.user_id);
      if (memberIds.length === 0) { setLoading(false); return; }

      // Fetch names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", memberIds);

      const nameMap = new Map((profiles ?? []).map(p => [p.user_id, p.display_name]));

      // Fetch salaries
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const { data: salaries } = await supabase
        .from("salaries")
        .select("user_id, amount")
        .in("user_id", memberIds)
        .eq("month", month)
        .eq("year", year);

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

      setMembers(
        memberIds.map(uid => ({
          user_id: uid,
          display_name: nameMap.get(uid) ?? "Usuário",
          total_income: incomeMap.get(uid) ?? 0,
        }))
      );
      setLoading(false);
    }
    fetchMembers();
  }, [selectedGroup, enabled, currentDate]);

  // Calculate splits
  const splits = useMemo(() => {
    if (!enabled || members.length === 0) return [];
    const parsedAmount = amount || 0;

    if (splitType === "equal") {
      const pct = 100 / members.length;
      const perPerson = parsedAmount / members.length;
      return members.map(m => ({
        user_id: m.user_id,
        percentage: Math.round(pct * 100) / 100,
        amount: Math.round(perPerson * 100) / 100,
      }));
    }

    // Proportional to income
    const totalIncome = members.reduce((s, m) => s + m.total_income, 0);
    if (totalIncome === 0) {
      // Fallback to equal if no income data
      const pct = 100 / members.length;
      const perPerson = parsedAmount / members.length;
      return members.map(m => ({
        user_id: m.user_id,
        percentage: Math.round(pct * 100) / 100,
        amount: Math.round(perPerson * 100) / 100,
      }));
    }

    return members.map(m => {
      const pct = (m.total_income / totalIncome) * 100;
      return {
        user_id: m.user_id,
        percentage: Math.round(pct * 100) / 100,
        amount: Math.round((parsedAmount * pct / 100) * 100) / 100,
      };
    });
  }, [enabled, members, amount, splitType]);

  // Notify parent
  useEffect(() => {
    onShareChange({
      enabled,
      groupId: selectedGroup,
      splitType,
      splits,
    });
  }, [enabled, selectedGroup, splitType, splits]);

  if (groups.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium">Despesa compartilhada</p>
            <p className="text-xs text-muted-foreground">Divide com membros do grupo familiar</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <div className="space-y-3 pt-1">
          {/* Group selector */}
          {groups.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Grupo</label>
              <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Split type */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tipo de divisão</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSplitType("proportional")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                  splitType === "proportional"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <Percent className="h-3.5 w-3.5" />
                Proporcional
              </button>
              <button
                type="button"
                onClick={() => setSplitType("equal")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                  splitType === "equal"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground hover:bg-muted/40"
                )}
              >
                <Split className="h-3.5 w-3.5" />
                Igualitário
              </button>
            </div>
          </div>

          {/* Preview splits */}
          {!loading && splits.length > 0 && amount > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Divisão</label>
              <div className="space-y-1">
                {splits.map(sp => {
                  const member = members.find(m => m.user_id === sp.user_id);
                  const isSelf = sp.user_id === userId;
                  return (
                    <div
                      key={sp.user_id}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-xs",
                        isSelf ? "bg-primary/5 border border-primary/10" : "bg-muted/30"
                      )}
                    >
                      <span className="font-medium">
                        {member?.display_name ?? "Usuário"}
                        {isSelf && <span className="text-muted-foreground ml-1">(você)</span>}
                      </span>
                      <span className="font-bold tabular-nums">
                        {fmt(sp.amount)}{" "}
                        <span className="font-normal text-muted-foreground">({sp.percentage.toFixed(0)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {splitType === "proportional" && members.some(m => m.total_income === 0) && (
            <p className="text-[11px] text-amber-500">
              ⚠️ Membros sem renda cadastrada neste mês terão divisão igual como fallback.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
