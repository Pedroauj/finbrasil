import * as React from "react";
import { useExpenseStore } from "@/hooks/useExpenseStore";
import { useAuth } from "@/hooks/useAuth";

import { Dashboard } from "@/components/Dashboard";
import { ExpenseTable } from "@/components/ExpenseTable";
import { IncomeManager } from "@/components/IncomeManager";
import { RecurringExpenses } from "@/components/RecurringExpenses";
import { FinancialCalendar } from "@/components/FinancialCalendar";
import { CreditCardManager } from "@/components/CreditCardManager";
import { AccountManager } from "@/components/AccountManager";
import { MonthNavigator } from "@/components/MonthNavigator";
import { ModeToggle } from "@/components/ModeToggle";
import { DEFAULT_CATEGORIES } from "@/types/expense";

import { Button } from "@/components/ui/button";
import { AssistantPanel } from "@/components/AssistantPanel";
import { PageShell } from "@/components/layout/PageShell";
import { FloatingAddButton } from "@/components/layout/FloatingAddButton";
import { AppShell, NavKey } from "@/components/AppShell";

import { Input } from "@/components/ui/input";
import { Bot, LogOut } from "lucide-react";

const NAV_LABELS: Record<NavKey, string> = {
  dashboard: "Dashboard",
  expenses: "Gastos",
  income: "Receitas",
  cards: "Cartões",
  recurring: "Recorrentes",
  calendar: "Calendário",
  accounts: "Contas",
  settings: "Ajustes",
};

const LS = {
  profileName: "finbrasil.profile.name",
  profileEmail: "finbrasil.profile.email",
  monthStartDay: "finbrasil.settings.monthStartDay",
  privacyMode: "finbrasil.settings.privacyMode",
} as const;

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch { }
}
function safeDel(key: string) {
  try {
    localStorage.removeItem(key);
  } catch { }
}

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function downloadTextFile(filename: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows: Array<Record<string, any>>) {
  if (!rows.length) return "";
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const escape = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    const needs = /[",\n;]/.test(s);
    const normalized = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const quoted = normalized.replace(/"/g, '""');
    return needs ? `"${quoted}"` : quoted;
  };

  // separador ";" pra Excel PT-BR
  const lines = [
    headers.map(escape).join(";"),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(";")),
  ];

  // BOM UTF-8 (abre certo no Excel)
  return "\uFEFF" + lines.join("\n");
}

export default function Index() {
  const auth = useAuth() as any;
  const { signOut } = auth;
  const store = useExpenseStore() as any;

  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [nav, setNav] = React.useState<NavKey>("dashboard");

  const allCategories = React.useMemo(
    () => [...DEFAULT_CATEGORIES, ...(store.customCategories ?? [])],
    [store.customCategories]
  );

  const pageTitle = React.useMemo(() => NAV_LABELS[nav] ?? "FinBrasil", [nav]);

  const onNewExpense = React.useCallback(() => {
    window.dispatchEvent(new Event("open-add-expense"));
  }, []);

  const subtitleByNav: Record<NavKey, string> = {
    dashboard: "Visão geral do mês e indicadores",
    expenses: "Gerencie e acompanhe suas despesas",
    income: "Registre salários e entradas extras",
    cards: "Controle faturas, compras e parcelas",
    recurring: "Automatize gastos recorrentes",
    calendar: "Visualize seus lançamentos no calendário",
    accounts: "Organize contas, saldos e transferências",
    settings: "Preferências, segurança e dados",
  };

  // =========================
  // Settings state (funcional)
  // =========================
  const [profileName, setProfileName] = React.useState("");
  const [profileEmail, setProfileEmail] = React.useState("");
  const [monthStartDay, setMonthStartDay] = React.useState<number>(1);
  const [privacyMode, setPrivacyMode] = React.useState<boolean>(false);

  React.useEffect(() => {
    const savedName = safeGet(LS.profileName) ?? "";
    const savedEmail = safeGet(LS.profileEmail) ?? "";
    const authEmail = auth?.user?.email ?? auth?.session?.user?.email ?? "";

    const savedMonth = parseInt(safeGet(LS.monthStartDay) ?? "1", 10);
    const savedPrivacy = (safeGet(LS.privacyMode) ?? "0") === "1";

    setProfileName(savedName);
    setProfileEmail(authEmail || savedEmail);
    setMonthStartDay(clampInt(savedMonth, 1, 28));
    setPrivacyMode(savedPrivacy);
  }, [auth?.user?.email, auth?.session?.user?.email]);

  const saveProfile = React.useCallback(() => {
    safeSet(LS.profileName, profileName.trim());
    safeSet(LS.profileEmail, profileEmail.trim());
    // se no futuro você tiver store/userProfile, liga aqui:
    // if (typeof store.setUserProfile === "function") store.setUserProfile({ name: profileName, email: profileEmail });
  }, [profileName, profileEmail]);

  const savePreferences = React.useCallback(() => {
    const day = clampInt(monthStartDay, 1, 28);
    setMonthStartDay(day);
    safeSet(LS.monthStartDay, String(day));
    safeSet(LS.privacyMode, privacyMode ? "1" : "0");

    // Se você tiver métodos no store, já “encaixa” sem quebrar:
    if (typeof store.setMonthStartDay === "function") store.setMonthStartDay(day);
    if (typeof store.setPrivacyMode === "function") store.setPrivacyMode(privacyMode);
  }, [monthStartDay, privacyMode, store]);

  const exportCSV = React.useCallback(() => {
    const expenses = Array.isArray(store.expenses) ? store.expenses : [];

    // Ajusta chaves conforme seu model real (sem quebrar se faltar campo)
    const rows = expenses.map((e: any) => ({
      date: e.date ?? "",
      description: e.description ?? "",
      category: e.category ?? "",
      amount: e.amount ?? "",
      status: e.status ?? "",
      accountId: e.accountId ?? e.account ?? "",
      paymentMethod: e.paymentMethod ?? "",
      createdAt: e.createdAt ?? "",
    }));

    const csv = toCSV(rows);
    const yyyy = new Date().getFullYear();
    downloadTextFile(`finbrasil-despesas-${yyyy}.csv`, csv, "text/csv;charset=utf-8");
  }, [store.expenses]);

  const resetFinance = React.useCallback(() => {
    const ok = window.confirm(
      "Tem certeza? Isso é irreversível.\n\nVou tentar limpar seus dados financeiros e configurações locais."
    );
    if (!ok) return;

    // limpar preferências locais
    safeDel(LS.profileName);
    safeDel(LS.profileEmail);
    safeDel(LS.monthStartDay);
    safeDel(LS.privacyMode);

    // tentar reset no store (sem quebrar se não existir)
    if (typeof store.resetAll === "function") store.resetAll();
    if (typeof store.clearAllData === "function") store.clearAllData();
    if (typeof store.resetFinance === "function") store.resetFinance();

    // fallback “manual”: tentar limpar listas conhecidas
    try {
      if (Array.isArray(store.expenses) && typeof store.setExpenses === "function") store.setExpenses([]);
    } catch { }

    // recarrega a página pra garantir estado limpo
    window.location.reload();
  }, [store]);

  const Content = React.useMemo(() => {
    switch (nav) {
      case "dashboard":
        return (
          <PageShell title="Dashboard" subtitle={subtitleByNav.dashboard}>
            <Dashboard
              expenses={store.expenses}
              budget={store.budget}
              prevMonthExpenses={store.prevMonthExpenses}
              currentDate={store.currentDate}
              cards={store.creditCards}
              invoices={store.invoices}
              monthBalance={store.monthBalance}
            />
          </PageShell>
        );

      case "expenses":
        return (
          <PageShell title="Gastos" subtitle={subtitleByNav.expenses}>
            <div className="space-y-5">
              <ExpenseTable
                expenses={store.expenses}
                customCategories={store.customCategories}
                currentDate={store.currentDate}
                accounts={store.financialAccounts}
                onAdd={store.addExpense}
                onUpdate={store.updateExpense}
                onDelete={store.deleteExpense}
                onAddCategory={store.addCustomCategory}
              />
            </div>
          </PageShell>
        );

      case "income":
        return (
          <PageShell title="Receitas" subtitle={subtitleByNav.income}>
            <div className="space-y-5">
              <IncomeManager
                salary={store.salary}
                extraIncomes={store.extraIncomes}
                budget={store.budget}
                customCategories={store.customCategories}
                currentDate={store.currentDate}
                onSaveSalary={store.saveSalary}
                onDeleteSalary={store.deleteSalary}
                onAddExtraIncome={store.addExtraIncome}
                onUpdateExtraIncome={store.updateExtraIncome}
                onDeleteExtraIncome={store.deleteExtraIncome}
                onSaveBudget={store.setBudget}
              />
            </div>
          </PageShell>
        );

      case "cards":
        return (
          <PageShell title="Cartões" subtitle={subtitleByNav.cards}>
            <div className="space-y-5">
              <CreditCardManager
                cards={store.creditCards}
                invoices={store.invoices}
                categories={allCategories}
                currentDate={store.currentDate}
                onAddCard={store.addCreditCard}
                onDeleteCard={store.deleteCreditCard}
                onAddInvoiceItem={store.addInvoiceItem}
                onAddInstallments={store.addInstallments}
                onRemoveInvoiceItem={store.removeInvoiceItem}
                onRemoveInstallmentGroup={store.removeInstallmentGroup}
                onTogglePaid={store.toggleInvoicePaid}
              />
            </div>
          </PageShell>
        );

      case "recurring":
        return (
          <PageShell title="Recorrentes" subtitle={subtitleByNav.recurring}>
            <div className="space-y-5">
              <RecurringExpenses
                recurringExpenses={store.recurringExpenses}
                customCategories={store.customCategories}
                onAdd={store.addRecurringExpense}
                onToggle={store.toggleRecurringExpense}
                onDelete={store.deleteRecurringExpense}
                onAddCategory={store.addCustomCategory}
              />
            </div>
          </PageShell>
        );

      case "calendar":
        return (
          <PageShell title="Calendário" subtitle={subtitleByNav.calendar}>
            <div className="space-y-5">
              <FinancialCalendar
                expenses={store.expenses}
                customCategories={store.customCategories}
                currentDate={store.currentDate}
                onAdd={store.addExpense}
                onUpdate={store.updateExpense}
                onDelete={store.deleteExpense}
                onAddCategory={store.addCustomCategory}
              />
            </div>
          </PageShell>
        );

      case "accounts":
        return (
          <PageShell title="Contas" subtitle={subtitleByNav.accounts}>
            <div className="space-y-5">
              <AccountManager
                accounts={store.financialAccounts}
                transfers={store.accountTransfers}
                adjustments={store.accountAdjustments}
                onAdd={store.addFinancialAccount}
                onUpdate={store.updateFinancialAccount}
                onDelete={store.deleteFinancialAccount}
                onTransfer={store.transferBetweenAccounts}
                onAdjust={store.addAccountAdjustment}
                onDeleteAdjustment={store.deleteAccountAdjustment}
                onToggleArchive={store.toggleAccountArchive}
              />
            </div>
          </PageShell>
        );

      case "settings":
        return (
          <PageShell title="Ajustes" subtitle={subtitleByNav.settings}>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* PERFIL */}
              <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
                <div className="text-sm font-semibold">Perfil</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Informações básicas da sua conta.
                </div>

                <div className="mt-4 space-y-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Nome</div>
                    <Input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Seu nome"
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Email</div>
                    <Input
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex justify-end">
                    <Button className="h-10 rounded-xl" onClick={saveProfile}>
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>

              {/* PREFERÊNCIAS */}
              <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
                <div className="text-sm font-semibold">Preferências</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Personalize a experiência do app.
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Tema</div>
                      <div className="text-xs text-muted-foreground">Claro / Escuro.</div>
                    </div>
                    <ModeToggle />
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Mês financeiro</div>
                      <div className="text-xs text-muted-foreground">
                        Dia que inicia seu mês (1–28).
                      </div>
                    </div>
                    <div className="w-[140px]">
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        value={monthStartDay}
                        onChange={(e) => setMonthStartDay(parseInt(e.target.value || "1", 10))}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Modo privacidade</div>
                      <div className="text-xs text-muted-foreground">
                        Ocultar valores por padrão.
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl"
                      onClick={() => setPrivacyMode((v) => !v)}
                    >
                      {privacyMode ? "Ativado" : "Desativado"}
                    </Button>
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex justify-end">
                    <Button className="h-10 rounded-xl" onClick={savePreferences}>
                      Salvar preferências
                    </Button>
                  </div>
                </div>
              </div>

              {/* SEGURANÇA (placeholder funcional) */}
              <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
                <div className="text-sm font-semibold">Segurança</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Em breve: troca de senha e 2FA.
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" className="h-10 rounded-xl">
                    Trocar senha (em breve)
                  </Button>
                  <Button variant="outline" className="h-10 rounded-xl">
                    Configurar 2FA (em breve)
                  </Button>
                </div>
              </div>

              {/* DADOS & PLANO */}
              <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
                <div className="text-sm font-semibold">Dados & Plano</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Exportação, limpeza e upgrades.
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Exportar dados</div>
                      <div className="text-xs text-muted-foreground">Baixar CSV das despesas.</div>
                    </div>
                    <Button variant="outline" className="h-10 rounded-xl" onClick={exportCSV}>
                      Exportar CSV
                    </Button>
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Reset financeiro</div>
                      <div className="text-xs text-muted-foreground">
                        Limpa dados (irreversível).
                      </div>
                    </div>
                    <Button variant="destructive" className="h-10 rounded-xl" onClick={resetFinance}>
                      Resetar
                    </Button>
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Plano</div>
                      <div className="text-xs text-muted-foreground">Freemium / Premium.</div>
                    </div>
                    <Button className="h-10 rounded-xl">Fazer upgrade</Button>
                  </div>
                </div>
              </div>
            </div>
          </PageShell>
        );

      default:
        return null;
    }
  }, [
    nav,
    store,
    allCategories,
    subtitleByNav,
    profileName,
    profileEmail,
    monthStartDay,
    privacyMode,
    saveProfile,
    savePreferences,
    exportCSV,
    resetFinance,
  ]);

  const rightActions = (
    <>
      <MonthNavigator currentDate={store.currentDate} onNavigate={store.navigateMonth} />

      <Button
        variant="outline"
        className="h-10 gap-2 rounded-xl"
        onClick={() => setAssistantOpen(true)}
      >
        <Bot className="h-4 w-4" />
        <span className="hidden sm:inline">Assistente</span>
      </Button>

      <ModeToggle />

      <Button variant="outline" className="h-10 gap-2 rounded-xl" onClick={signOut}>
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sair</span>
      </Button>
    </>
  );

  return (
    <>
      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />

      <AppShell
        active={nav}
        onNavigate={setNav}
        title={pageTitle}
        rightActions={rightActions}
        onNewExpense={onNewExpense}
      >
        {Content}
      </AppShell>

      {/* FAB apenas no mobile (evita duplicar com o botão da sidebar) */}
      <div className="xl:hidden">
        <FloatingAddButton onClick={onNewExpense} />
      </div>
    </>
  );
}