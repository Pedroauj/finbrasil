import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Copy, Check, Crown, Eye, Pencil, Shield,
  Link2, Trash2, LogOut, Plus, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const appCard =
  "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm";

const PERMISSION_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  view: { label: "Visualizar", icon: Eye, color: "hsl(217, 91%, 60%)" },
  edit: { label: "Editar", icon: Pencil, color: "hsl(45, 93%, 47%)" },
  admin: { label: "Administrador", icon: Shield, color: "hsl(280, 67%, 60%)" },
};

interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
}

interface FamilyMember {
  id: string;
  group_id: string;
  user_id: string;
  permission: string;
  joined_at: string;
  display_name?: string;
}

interface FamilyManagerProps {
  userId: string;
}

export function FamilyManager({ userId }: FamilyManagerProps) {
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);

    // Fetch groups where user is owner
    const { data: ownedGroups } = await supabase
      .from("family_groups" as any)
      .select("*")
      .eq("owner_id", userId);

    // Fetch groups where user is member
    const { data: memberOf } = await supabase
      .from("family_members" as any)
      .select("group_id")
      .eq("user_id", userId);

    const memberGroupIds = (memberOf ?? []).map((m: any) => m.group_id);
    let memberGroups: any[] = [];

    if (memberGroupIds.length > 0) {
      const { data } = await supabase
        .from("family_groups" as any)
        .select("*")
        .in("id", memberGroupIds);
      memberGroups = data ?? [];
    }

    const allGroups = [...(ownedGroups ?? []), ...memberGroups].filter(
      (g, i, arr) => arr.findIndex(x => (x as any).id === (g as any).id) === i
    );
    setGroups(allGroups as any[]);

    // Fetch all members for these groups
    if (allGroups.length > 0) {
      const groupIds = allGroups.map((g: any) => g.id);
      const { data: allMembers } = await supabase
        .from("family_members" as any)
        .select("*")
        .in("group_id", groupIds);

      // Fetch display names
      if (allMembers && allMembers.length > 0) {
        const userIds = [...new Set((allMembers as any[]).map(m => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        const nameMap = new Map((profiles ?? []).map(p => [p.user_id, p.display_name]));
        setMembers(
          (allMembers as any[]).map(m => ({
            ...m,
            display_name: nameMap.get(m.user_id) ?? "Usuário",
          }))
        );
      } else {
        setMembers([]);
      }
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createGroup = async () => {
    if (!groupName.trim()) { toast.error("Digite um nome para o grupo."); return; }

    const { data, error } = await supabase
      .from("family_groups" as any)
      .insert({ owner_id: userId, name: groupName.trim() } as any)
      .select()
      .single();

    if (error) { toast.error("Erro ao criar grupo."); return; }

    // Add owner as admin member
    await supabase.from("family_members" as any).insert({
      group_id: (data as any).id,
      user_id: userId,
      permission: "admin",
    } as any);

    toast.success("Grupo criado!");
    setGroupName("");
    setShowCreate(false);
    fetchData();
  };

  const joinGroup = async () => {
    if (!joinCode.trim()) { toast.error("Digite o código de convite."); return; }

    const { data: group } = await supabase
      .from("family_groups" as any)
      .select("*")
      .eq("invite_code", joinCode.trim().toLowerCase())
      .maybeSingle();

    if (!group) { toast.error("Código inválido."); return; }

    const { error } = await supabase
      .from("family_members" as any)
      .insert({
        group_id: (group as any).id,
        user_id: userId,
        permission: "view",
      } as any);

    if (error) {
      if (error.code === "23505") toast.error("Você já faz parte deste grupo.");
      else toast.error("Erro ao entrar no grupo.");
      return;
    }

    toast.success(`Você entrou no grupo "${(group as any).name}"!`);
    setJoinCode("");
    setShowJoin(false);
    fetchData();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const updatePermission = async (memberId: string, permission: string) => {
    await supabase
      .from("family_members" as any)
      .update({ permission } as any)
      .eq("id", memberId);
    toast.success("Permissão atualizada!");
    fetchData();
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("family_members" as any).delete().eq("id", memberId);
    toast.success("Membro removido.");
    fetchData();
  };

  const leaveGroup = async (groupId: string) => {
    await supabase
      .from("family_members" as any)
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    toast.success("Você saiu do grupo.");
    fetchData();
  };

  const deleteGroup = async (groupId: string) => {
    const ok = window.confirm("Tem certeza? Isso removerá o grupo e todos os membros.");
    if (!ok) return;
    await supabase.from("family_groups" as any).delete().eq("id", groupId);
    toast.success("Grupo excluído.");
    fetchData();
  };

  const regenerateCode = async (groupId: string) => {
    const newCode = Math.random().toString(36).substring(2, 10);
    await supabase
      .from("family_groups" as any)
      .update({ invite_code: newCode } as any)
      .eq("id", groupId);
    toast.success("Novo código gerado!");
    fetchData();
  };

  if (loading) {
    return (
      <div className={cn(appCard, "p-8 text-center")}>
        <RefreshCw className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant={showCreate ? "default" : "outline"}
          className="h-10 rounded-xl gap-2"
          onClick={() => { setShowCreate(!showCreate); setShowJoin(false); }}
        >
          <Plus className="h-4 w-4" />
          Criar grupo
        </Button>
        <Button
          variant={showJoin ? "default" : "outline"}
          className="h-10 rounded-xl gap-2"
          onClick={() => { setShowJoin(!showJoin); setShowCreate(false); }}
        >
          <Link2 className="h-4 w-4" />
          Entrar com código
        </Button>
      </div>

      {/* Create Group Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(appCard, "p-5 space-y-3")}
          >
            <p className="text-sm font-semibold">Criar novo grupo familiar</p>
            <Input
              placeholder="Nome do grupo (ex: Família Silva)"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="h-11 rounded-xl"
            />
            <Button className="w-full h-10 rounded-xl gap-2" onClick={createGroup}>
              <Users className="h-4 w-4" /> Criar grupo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Join Group Form */}
      <AnimatePresence>
        {showJoin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(appCard, "p-5 space-y-3")}
          >
            <p className="text-sm font-semibold">Entrar em um grupo</p>
            <Input
              placeholder="Código de convite"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              className="h-11 rounded-xl font-mono tracking-wider"
            />
            <Button className="w-full h-10 rounded-xl gap-2" onClick={joinGroup}>
              <UserPlus className="h-4 w-4" /> Entrar no grupo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className={cn(appCard, "p-8 text-center")}>
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium">Nenhum grupo familiar</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie um grupo ou entre com um código de convite para compartilhar finanças.
          </p>
        </div>
      ) : (
        groups.map(group => {
          const isOwner = group.owner_id === userId;
          const groupMembers = members.filter(m => m.group_id === group.id);

          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(appCard, "overflow-hidden")}
            >
              {/* Group Header */}
              <div className="p-5 border-b border-border/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2.5">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        {group.name}
                        {isOwner && (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Crown className="h-2.5 w-2.5" /> Dono
                          </Badge>
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {groupMembers.length} {groupMembers.length === 1 ? "membro" : "membros"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {isOwner ? (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => deleteGroup(group.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => leaveGroup(group.id)}>
                        <LogOut className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Invite Code */}
                {isOwner && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-muted/40 p-3">
                    <p className="text-xs text-muted-foreground">Código de convite:</p>
                    <code className="font-mono text-sm font-bold tracking-wider text-primary">
                      {group.invite_code}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg ml-auto"
                      onClick={() => copyCode(group.invite_code)}
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => regenerateCode(group.id)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Members */}
              <div className="p-4 space-y-2">
                {groupMembers.map(member => {
                  const perm = PERMISSION_LABELS[member.permission] ?? PERMISSION_LABELS.view;
                  const PermIcon = perm.icon;
                  const isSelf = member.user_id === userId;
                  const canManage = isOwner && !isSelf;

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/20 p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">
                            {member.display_name ?? "Usuário"}
                          </span>
                          {isSelf && (
                            <Badge variant="secondary" className="text-[10px]">Você</Badge>
                          )}
                          {member.user_id === group.owner_id && (
                            <Crown className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                      </div>

                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={member.permission}
                            onValueChange={(v) => updatePermission(member.id, v)}
                          >
                            <SelectTrigger className="h-8 w-32 rounded-lg text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="view">👁 Visualizar</SelectItem>
                              <SelectItem value="edit">✏️ Editar</SelectItem>
                              <SelectItem value="admin">🛡 Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-destructive"
                            onClick={() => removeMember(member.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <PermIcon className="h-2.5 w-2.5" />
                          {perm.label}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
}
