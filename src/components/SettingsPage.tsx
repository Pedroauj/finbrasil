import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlansSection } from "@/components/PlansSection";
import { AdminPanel } from "@/components/AdminPanel";
import { ThemePicker } from "@/components/ThemePicker";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import { WhatsAppSettings } from "@/components/WhatsAppSettings";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, Palette, Database, Target, Plus, Trash2,
  Download, AlertTriangle, Calendar, Eye, EyeOff, Bell,
  Lock, Mail, Save, Crown, Sun, Moon, Monitor, ChevronRight,
  FileDown, RotateCcw, KeyRound, MessageSquare, Smartphone,
  Settings2, HelpCircle, CreditCard, Wallet,
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

// ─── Quick Setting Item ─────────────────────
function QuickSetting({ icon: Icon, label, description, children, danger }: {
  icon: React.ElementType; label: string; description?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 px-1">
      <div className="flex items-start gap-3 min-w-0">
        <div className={cn(
          "rounded-xl p-2.5 shrink-0",
          danger ? "bg-destructive/10" : "bg-muted/50"
        )}>
          <Icon className={cn("h-4 w-4", danger ? "text-destructive" : "text-muted-foreground")} />
        </div>
        <div className="min-w-0">
          <div className={cn("text-sm font-medium leading-tight", danger && "text-destructive")}>{label}</div>
          {description && <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</div>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Divider() { return <div className="h-px bg-border/30 mx-1" />; }

// ─── Section with collapsible header ────────
function SettingsSection({ title, icon: Icon, children, defaultOpen = true, badge, className }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean; badge?: string; className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "rounded-2xl border border-border/40 bg-card/60 backdrop-blur overflow-hidden",
        className
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors"
      >
        <div className="rounded-xl bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold flex-1 text-left">{title}</span>
        {badge && (
          <Badge variant="secondary" className="text-[10px] mr-1">{badge}</Badge>
        )}
        <ChevronRight className={cn(
          "h-4 w-4 text-muted-foreground transition-transform duration-200",
          open && "rotate-90"
        )} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Nav Item for sidebar navigation in settings ─
function SettingsNavItem({ icon: Icon, label, active, onClick }: {
  icon: React.ElementType; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
        active
          ? "bg-primary/10 text-primary font-semibold"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
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
  initialTab?: string;
}

type SettingsTab = "profile" | "appearance" | "financial" | "notifications" | "plans" | "data" | "admin";

const SETTINGS_TABS: Array<{ key: SettingsTab; label: string; icon: React.ElementType; adminOnly?: boolean }> = [
  { key: "profile", label: "Perfil & Segurança", icon: User },
  { key: "appearance", label: "Aparência", icon: Palette },
  { key: "financial", label: "Financeiro", icon: Wallet },
  { key: "notifications", label: "Notificações", icon: Bell },
  { key: "plans", label: "Planos", icon: Crown },
  { key: "data", label: "Dados & Exportação", icon: Database },
  { key: "admin", label: "Administração", icon: Shield, adminOnly: true },
];

export function SettingsPage({ store, auth, userPlan, userRole, alertDaysBefore, setAlertDaysBefore, initialTab }: SettingsPageProps) {
  const { theme, setTheme } = useTheme();

  const resolveTab = (t?: string): SettingsTab => {
    if (t === "plans") return "plans";
    if (t === "preferences") return "appearance";
    return "profile";
  };

  const [activeTab, setActiveTab] = useState<SettingsTab>(resolveTab(initialTab));

  useEffect(() => {
    if (initialTab) setActiveTab(resolveTab(initialTab));
  }, [initialTab]);

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [monthStartDayDraft, setMonthStartDayDraft] = useState(1);
  const [privacyMode, setPrivacyMode] = useState(false);

  // Password change
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
    if (auth?.user?.id) {
      await supabase.from("profiles").update({ display_name: profileName.trim() } as any).eq("user_id", auth.user.id);
    }
    toast.success("Perfil salvo!");
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
      toast.success("Senha alterada!");
      setNewPassword(""); setConfirmPassword("");
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
    toast.success("CSV exportado!");
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

  const visibleTabs = SETTINGS_TABS.filter(t => !t.adminOnly || userRole === "admin" || userRole === "owner");

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <div className="space-y-4">
            <SettingsSection title="Informações pessoais" icon={User}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nome</label>
                  <Input
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                  <Input value={profileEmail} disabled className="h-11 rounded-xl bg-muted/30" />
                  <p className="text-[11px] text-muted-foreground">O email não pode ser alterado.</p>
                </div>
                <Button className="w-full h-10 rounded-xl gap-2" onClick={saveProfile}>
                  <Save className="h-4 w-4" /> Salvar perfil
                </Button>
              </div>
            </SettingsSection>

            <SettingsSection title="Segurança" icon={Lock} defaultOpen={false}>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nova senha</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmar</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="h-11 rounded-xl"
                  />
                </div>
                <Button
                  className="w-full h-10 rounded-xl gap-2"
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                >
                  <KeyRound className="h-4 w-4" />
                  {changingPassword ? "Alterando..." : "Alterar senha"}
                </Button>
              </div>
            </SettingsSection>
          </div>
        );

      case "appearance":
        return (
          <div className="space-y-4">
            <SettingsSection title="Tema" icon={Palette}>
              <ThemePicker />
            </SettingsSection>

            <SettingsSection title="Privacidade visual" icon={Eye}>
              <QuickSetting icon={EyeOff} label="Modo privacidade" description="Oculta valores monetários na tela">
                <Switch
                  checked={privacyMode}
                  onCheckedChange={(v) => {
                    setPrivacyMode(v);
                    safeSet(LS.privacyMode, v ? "1" : "0");
                    if (typeof store.setPrivacyMode === "function") store.setPrivacyMode(v);
                    toast.success(v ? "Modo privacidade ativado" : "Modo privacidade desativado");
                  }}
                />
              </QuickSetting>
            </SettingsSection>
          </div>
        );

      case "financial":
        return (
          <div className="space-y-4">
            <SettingsSection title="Ciclo financeiro" icon={Calendar}>
              <QuickSetting icon={Calendar} label="Início do mês financeiro" description="Dia que inicia seu ciclo mensal (1–28)">
                <Input
                  type="number"
                  min={1} max={28}
                  value={monthStartDayDraft}
                  onChange={e => setMonthStartDayDraft(parseInt(e.target.value || "1", 10))}
                  className="w-[72px] h-10 rounded-xl text-center"
                />
              </QuickSetting>
              <Divider />
              <div className="flex justify-end pt-2">
                <Button size="sm" className="h-9 rounded-xl gap-2" onClick={savePreferences}>
                  <Save className="h-3.5 w-3.5" /> Salvar
                </Button>
              </div>
            </SettingsSection>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            <SettingsSection title="Alertas de vencimento" icon={Bell}>
              <QuickSetting icon={Bell} label="Dias de antecedência" description="Quando notificar sobre gastos próximos">
                <Select
                  value={String(alertDaysBefore)}
                  onValueChange={v => {
                    const n = parseInt(v, 10);
                    setAlertDaysBefore(n);
                    try { localStorage.setItem("finbrasil.settings.alertDaysBefore", v); } catch {}
                  }}
                >
                  <SelectTrigger className="w-[90px] h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {[1, 2, 3, 5, 7].map(d => (
                      <SelectItem key={d} value={String(d)}>{d} {d === 1 ? "dia" : "dias"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </QuickSetting>
            </SettingsSection>

            <SettingsSection title="WhatsApp" icon={Smartphone} defaultOpen={false}>
              {auth?.user?.id ? (
                <WhatsAppSettings userId={auth.user.id} />
              ) : (
                <p className="text-sm text-muted-foreground py-4">Faça login para configurar o WhatsApp.</p>
              )}
            </SettingsSection>
          </div>
        );

      case "plans":
        return <PlansSection currentPlan={userPlan} />;

      case "data":
        return (
          <div className="space-y-4">
            <SettingsSection title="Exportação" icon={FileDown}>
              <QuickSetting icon={Download} label="Exportar despesas" description="Baixe um arquivo CSV com todas as suas despesas">
                <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2" onClick={exportCSV}>
                  <FileDown className="h-3.5 w-3.5" /> CSV
                </Button>
              </QuickSetting>
              <Divider />
              <div className="rounded-xl bg-muted/30 p-3 mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Mês financeiro: dia <span className="font-medium text-foreground">{store?.monthStartDay ?? 1}</span>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Zona de perigo" icon={AlertTriangle} defaultOpen={false} className="border-destructive/20">
              <QuickSetting icon={RotateCcw} label="Reset financeiro" description="Apaga todos os dados e configurações locais. Irreversível." danger>
                <Button variant="destructive" size="sm" className="h-9 rounded-xl gap-2" onClick={resetFinance}>
                  <AlertTriangle className="h-3.5 w-3.5" /> Resetar
                </Button>
              </QuickSetting>
            </SettingsSection>
          </div>
        );

      case "admin":
        return (
          <div className="space-y-4">
            <AdminPanel currentUserRole={userRole} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:w-56 shrink-0">
        <div className="lg:sticky lg:top-4">
          {/* Mobile: horizontal scroll */}
          <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {visibleTabs.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0",
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/30 text-muted-foreground"
                  )}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Desktop: vertical nav */}
          <nav className="hidden lg:flex flex-col gap-1">
            {visibleTabs.map(tab => (
              <SettingsNavItem
                key={tab.key}
                icon={tab.icon}
                label={tab.label}
                active={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
