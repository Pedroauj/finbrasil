import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users } from "lucide-react";
import type { PlanTier, UserRole } from "@/lib/plans";
import { cn } from "@/lib/utils";

interface AdminUser {
  user_id: string;
  display_name: string | null;
  plan: PlanTier;
  role: UserRole;
}

interface AdminPanelProps {
  currentUserRole: UserRole;
}

export function AdminPanel({ currentUserRole }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*");
    if (data) {
      setUsers(
        data.map((u: any) => ({
          user_id: u.user_id,
          display_name: u.display_name,
          plan: u.plan ?? "free",
          role: u.role ?? "user",
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateUser = async (userId: string, field: "plan" | "role", value: string) => {
    if (field === "role" && value === "owner" && currentUserRole !== "owner") return;
    await supabase.from("profiles").update({ [field]: value } as any).eq("user_id", userId);
    setUsers((prev) =>
      prev.map((u) => (u.user_id === userId ? { ...u, [field]: value } : u))
    );
  };

  if (loading) return null;

  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur lg:col-span-2">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-4 w-4 text-primary" />
        <div className="text-sm font-semibold">Administração</div>
      </div>
      <div className="text-xs text-muted-foreground mb-4">
        Gerencie usuários, planos e permissões.
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <Users className="h-3.5 w-3.5" />
        {users.length} usuário{users.length !== 1 ? "s" : ""}
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {users.map((user) => (
          <div
            key={user.user_id}
            className="rounded-xl border border-border/40 bg-background/20 p-3 flex flex-wrap items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">
                {user.display_name || "Sem nome"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {user.user_id.slice(0, 8)}...
              </div>
            </div>

            <Badge variant="outline" className="text-[10px]">
              {user.role}
            </Badge>

            <Select
              value={user.plan}
              onValueChange={(v) => updateUser(user.user_id, "plan", v)}
            >
              <SelectTrigger className="h-8 w-28 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="ultra">Ultra</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={user.role}
              onValueChange={(v) => updateUser(user.user_id, "role", v)}
            >
              <SelectTrigger className="h-8 w-24 rounded-lg text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {currentUserRole === "owner" && (
                  <SelectItem value="owner">Owner</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
