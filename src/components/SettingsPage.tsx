import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlansSection } from "@/components/PlansSection";
import { AdminPanel } from "@/components/AdminPanel";
import { ModeToggle } from "@/components/ModeToggle";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, Palette, Database, Target, Plus, Trash2,
  Download, AlertTriangle, Calendar, Eye, EyeOff, Bell,
  Lock, Mail, Save, Crown, Sun, Moon, Monitor, ChevronRight,
  FileDown, RotateCcw, KeyRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanTier, UserRole } from "@/lib/plans";

// ─── Helpers ────────────────────────────────
function safeGet(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key: string, value: string) { try { localStorage.setItem(key, value); } catch {} }
function safeDel(key: string) { try { localStorage.removeItem(key); } catch {} }
function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows: Array<Record<string, any>>) {
  if (!rows.length) return "";
  const headers = Array.from(rows.reduce<Set<string>>((set, r) => { Object.keys(r).forEach(k => set.add(k)); return set; }, new Set()));
  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [headers.map(escape).join(";"), ...rows.map(r => headers.map(h => escape(r[h])).join(";"))].join("\n");
}

const LS = {
  profileName: "finbrasil.profile.name",
  profileEmail: "finbrasil.profile.email",
  monthStartDay: "finbrasil.settings.monthStartDay",
  privacyMode: "finbrasil.settings.privacyMode",
} as const;

// ─── Goals Manager ──────────────────────────
interface FinancialGoal { id: string; description: string; target: number; current: number; }

function GoalsManager() {
  const [goals, setGoals] = useState<FinancialGoal[]>(() => {
    try { const r = localStorage.getItem("finbrasil.goals"); return r ? JSON.parse(r) : []; } catch { return []; }
  });
  const [desc, setDesc] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");

  const save = (updated: FinancialGoal[]) => {
    setGoals(updated);
    try { localStorage.setItem("finbrasil.goals", JSON.stringify(updated)); } catch {}
  };

  const add = () => {
    const t = parseFloat(target);
    const c = parseFloat(current) || 0;
    if (!desc.trim() || isNaN(t) || t <= 0) return;
    save([...goals, { id: crypto.randomUUID(), description: desc.trim(), target: t, current: c }]);
    setDesc(""); setTarget(""); setCurrent("");
    toast.success("Meta adicionada!");
  };

  return (
    <div className="space-y-4">
      {goals.length > 0 ? (
        <div className="space-y-3">
          {goals.map(g => {
            const pct = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0;
            return (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border/40 bg-muted/30 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold truncate">{g.description}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => save(goals.filter(x => x.id !== g.id))}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
                <Progress value={pct} className="h-2 rounded-full" />
                <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5">
                  <span>R$ {g.current.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  <span className="font-medium text-foreground">{pct.toFixed(0)}%</span>
                  <span>R$ {g.target.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma meta definida ainda</p>
          <p className="text-xs mt-1">Adicione sua primeira meta financeira abaixo</p>
        </div>
      )}

      <div className="rounded-2xl border border-dashed border-border/60 p-4 space-y-3">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nova meta</div>
        <Input placeholder="Ex: Reserva de emergência" value={desc} onChange={e => setDesc(e.target.value)} className="h-10 rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Valor alvo (R$)" type="number" value={target} onChange={e => setTarget(e.target.value)} className="h-10 rounded-xl" />
          <Input placeholder="Valor atual (R$)" type="number" value={current} onChange={e => setCurrent(e.target.value)} className="h-10 rounded-xl" />
        </div>
        <Button className="w-full h-10 rounded-xl gap-2" onClick={add}>
          <Plus className="h-4 w-4" /> Adicionar meta
        </Button>
      </div>
    </div>
  );
}

// ─── Setting Row ────────────────────────────
function SettingRow({ icon: Icon, title, description, children, danger }: {
  icon: React.ElementType; title: string; description: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className={cn("rounded-xl p-2 shrink-0 mt-0.5", danger ? "bg-destructive/10" : "bg-muted/60")}>
          <Icon className={cn("h-4 w-4", danger ? "text-destructive" : "text-muted-foreground")} />
        </div>
        <div className="min-w-0">
          <div className={cn("text-sm font-medium", danger && "text-destructive")}>{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Divider() { return <div className="h-px bg-border/40" />; }

// ─── Section Card ───────────────────────────
function SectionCard({ title, icon: Icon, children, className }: {
  title: string; icon: React.ElementType; children: React.ReactNode; className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("rounded-3xl border border-border/50 bg-card/70 p-6 shadow-sm backdrop-blur", className)}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="rounded-xl bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────
interface SettingsPageProps {
  store: any;
  auth: any;
  userPlan: PlanTier;
  userRole: UserRole;
  alertDaysBefore: number;
  setAlertDaysBefore: (v: number) => void;
}

export function SettingsPage({ store, auth, userPlan, userRole, alertDaysBefore, setAlertDaysBefore }: SettingsPageProps) {
  const { theme, setTheme } = useTheme();

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [monthStartDayDraft, setMonthStartDayDraft] = useState(1);
  const [privacyMode, setPrivacyMode] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    setProfileName(safeGet(LS.profileName) ?? "");
    setProfileEmail(auth?.user?.email ?? auth?.session?.user?.email ?? safeGet(LS.profileEmail) ?? "");
    setPrivacyMode((safeGet(LS.privacyMode) ?? "0") === "1");
    setMonthStartDayDraft(clampInt(Number(store?.monthStartDay ?? 1), 1, 28));
  }, [auth?.user?.email, auth?.session?.user?.email, store?.monthStartDay]);

  const saveProfile = useCallback(async () => {
    safeSet(LS.profileName, profileName.trim());
    safeSet(LS.profileEmail, profileEmail.trim());
    // Also save display_name to database
    if (auth?.user?.id) {
      await supabase.from("profiles").update({ display_name: profileName.trim() } as any).eq("user_id", auth.user.id);
    }
    toast.success("Perfil salvo com sucesso!");
  }, [profileName, profileEmail, auth?.user?.id]);

  const savePreferences = useCallback(() => {
    const day = clampInt(monthStartDayDraft, 1, 28);
    setMonthStartDayDraft(day);
    safeSet(LS.monthStartDay, String(day));
    safeSet(LS.privacyMode, privacyMode ? "1" : "0");
    if (typeof store.setMonthStartDay === "function") store.setMonthStartDay(day);
    if (typeof store.setPrivacyMode === "function") store.setPrivacyMode(privacyMode);
    toast.success("Preferências salvas!");
  }, [monthStartDayDraft, privacyMode, store]);

  const handleChangePassword = useCallback(async () => {
    if (newPassword.length < 6) { toast.error("A senha deve ter pelo menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { toast.error("As senhas não coincidem."); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao alterar senha.");
    } finally {
      setChangingPassword(false);
    }
  }, [newPassword, confirmPassword]);

  const exportCSV = useCallback(() => {
    const expenses = Array.isArray(store.expenses) ? store.expenses : [];
    const rows = expenses.map((e: any) => ({
      data: e.date ?? "", descricao: e.description ?? "", categoria: e.category ?? "",
      valor: e.amount ?? "", status: e.status ?? "", conta: e.accountId ?? e.account ?? "",
    }));
    const csv = toCSV(rows);
    downloadTextFile(`finbrasil-despesas-${new Date().getFullYear()}.csv`, csv, "text/csv;charset=utf-8");
    toast.success("CSV exportado com sucesso!");
  }, [store.expenses]);

  const resetFinance = useCallback(() => {
    const ok = window.confirm("Tem certeza? Isso é irreversível.\n\nTodos os seus dados financeiros e configurações locais serão apagados.");
    if (!ok) return;
    safeDel(LS.profileName); safeDel(LS.profileEmail); safeDel(LS.monthStartDay); safeDel(LS.privacyMode);
    if (typeof store.resetAll === "function") store.resetAll();
    if (typeof store.clearAllData === "function") store.clearAllData();
    if (typeof store.resetFinance === "function") store.resetFinance();
    window.location.reload();
  }, [store]);

  const themeLabel = theme === "dark" ? "Escuro" : theme === "light" ? "Claro" : "Sistema";

  return (
    <Tabs defaultValue="profile" className="space-y-6">
      <TabsList className="bg-muted/50 backdrop-blur rounded-2xl h-12 p-1 w-full grid grid-cols-4">
        <TabsTrigger value="profile" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs sm:text-sm">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Perfil</span>
        </TabsTrigger>
        <TabsTrigger value="preferences" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs sm:text-sm">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Preferências</span>
        </TabsTrigger>
        <TabsTrigger value="plans" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs sm:text-sm">
          <Crown className="h-4 w-4" />
          <span className="hidden sm:inline">Planos</span>
        </TabsTrigger>
        <TabsTrigger value="data" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2 text-xs sm:text-sm">
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline">Dados</span>
        </TabsTrigger>
      </TabsList>

      {/* ═══ PERFIL ═══ */}
      <TabsContent value="profile" className="space-y-5 mt-0">
        <SectionCard title="Informações pessoais" icon={User}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome de exibição</label>
              <Input
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="Seu nome"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                value={profileEmail}
                disabled
                className="h-11 rounded-xl bg-muted/40"
              />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado diretamente.</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button className="h-10 rounded-xl gap-2" onClick={saveProfile}>
                <Save className="h-4 w-4" /> Salvar perfil
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Segurança" icon={Shield}>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova senha</label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar nova senha</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                className="h-10 rounded-xl gap-2"
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
              >
                <KeyRound className="h-4 w-4" />
                {changingPassword ? "Alterando..." : "Alterar senha"}
              </Button>
            </div>
          </div>
        </SectionCard>
      </TabsContent>

      {/* ═══ PREFERÊNCIAS ═══ */}
      <TabsContent value="preferences" className="space-y-5 mt-0">
        <SectionCard title="Aparência" icon={Palette}>
          <SettingRow icon={Sun} title="Tema" description="Escolha entre claro, escuro ou sistema.">
            <Select value={theme ?? "system"} onValueChange={(v) => setTheme(v as any)}>
              <SelectTrigger className="w-[130px] h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="light">☀️ Claro</SelectItem>
                <SelectItem value="dark">🌙 Escuro</SelectItem>
                <SelectItem value="system">💻 Sistema</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
          <Divider />
          <SettingRow icon={Eye} title="Modo privacidade" description="Oculta valores monetários na tela.">
            <Switch checked={privacyMode} onCheckedChange={setPrivacyMode} />
          </SettingRow>
        </SectionCard>

        <SectionCard title="Financeiro" icon={Calendar}>
          <SettingRow icon={Calendar} title="Início do mês financeiro" description="Dia que inicia seu ciclo mensal (1–28).">
            <Input
              type="number"
              min={1} max={28}
              value={monthStartDayDraft}
              onChange={e => setMonthStartDayDraft(parseInt(e.target.value || "1", 10))}
              className="w-[80px] h-10 rounded-xl text-center"
            />
          </SettingRow>
          <Divider />
          <SettingRow icon={Bell} title="Dias de antecedência para alertas" description="Quando notificar sobre gastos próximos.">
            <Select
              value={String(alertDaysBefore)}
              onValueChange={v => {
                const n = parseInt(v, 10);
                setAlertDaysBefore(n);
                try { localStorage.setItem("finbrasil.settings.alertDaysBefore", v); } catch {}
              }}
            >
              <SelectTrigger className="w-[100px] h-10 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {[1, 2, 3, 5, 7].map(d => (
                  <SelectItem key={d} value={String(d)}>{d} {d === 1 ? "dia" : "dias"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <Divider />
          <div className="flex justify-end pt-3">
            <Button className="h-10 rounded-xl gap-2" onClick={savePreferences}>
              <Save className="h-4 w-4" /> Salvar preferências
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Metas financeiras" icon={Target}>
          <GoalsManager />
        </SectionCard>
      </TabsContent>

      {/* ═══ PLANOS ═══ */}
      <TabsContent value="plans" className="space-y-5 mt-0">
        <PlansSection currentPlan={userPlan} />
      </TabsContent>

      {/* ═══ DADOS ═══ */}
      <TabsContent value="data" className="space-y-5 mt-0">
        <SectionCard title="Exportação" icon={FileDown}>
          <SettingRow icon={Download} title="Exportar despesas" description="Baixe um arquivo CSV com todas as suas despesas.">
            <Button variant="outline" className="h-10 rounded-xl gap-2" onClick={exportCSV}>
              <FileDown className="h-4 w-4" /> Exportar CSV
            </Button>
          </SettingRow>
          <Divider />
          <div className="rounded-2xl bg-muted/30 p-4 mt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Mês financeiro atual: dia <span className="font-medium text-foreground">{store?.monthStartDay ?? 1}</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Zona de perigo" icon={AlertTriangle} className="border-destructive/20">
          <SettingRow icon={RotateCcw} title="Reset financeiro" description="Apaga todos os dados financeiros e configurações locais. Esta ação é irreversível." danger>
            <Button variant="destructive" className="h-10 rounded-xl gap-2" onClick={resetFinance}>
              <AlertTriangle className="h-4 w-4" /> Resetar tudo
            </Button>
          </SettingRow>
        </SectionCard>

        {/* Admin panel */}
        {(userRole === "owner" || userRole === "admin") && (
          <AdminPanel currentUserRole={userRole} />
        )}
      </TabsContent>
    </Tabs>
  );
}
