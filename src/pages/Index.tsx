import * as React from "react";
import { toast } from "sonner";
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
import type { Expense } from "@/types/expense";
import { useUpcomingAlertCount } from "@/components/UpcomingAlerts";
import { ReportsPage } from "@/components/ReportsPage";
import { FinancialGoals } from "@/components/FinancialGoals";
import { CSVImporter } from "@/components/CSVImporter";
import { SmartAlerts } from "@/components/SmartAlerts";
import { OnboardingTour, useOnboarding } from "@/components/OnboardingTour";
import { AnalyticsDashboard } from "@/components/AnalyticsDashboard";
import { initAnalytics, trackPageView, trackNavigation, trackFeatureUsage } from "@/lib/internalAnalytics";

import { Button } from "@/components/ui/button";
import { AssistantPanel } from "@/components/AssistantPanel";
import { PageShell } from "@/components/layout/PageShell";
import { FloatingAddButton } from "@/components/layout/FloatingAddButton";
import { AppShell, NavKey } from "@/components/AppShell";

import { Bot, LogOut } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { PremiumModal } from "@/components/PremiumModal";
import { SettingsPage } from "@/components/SettingsPage";

const NAV_LABELS: Record<NavKey, string> = {
  dashboard: "Dashboard",
  expenses: "Gastos",
  income: "Receitas",
  cards: "Cartões",
  recurring: "Recorrentes",
  calendar: "Calendário",
  accounts: "Contas",
  reports: "Relatórios",
  goals: "Metas",
  settings: "Ajustes",
};

const LS_ALERT_DAYS = "finbrasil.settings.alertDaysBefore";

export default function Index() {
  const auth = useAuth() as any;
  const { signOut } = auth;
  const store = useExpenseStore() as any;

  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [nav, setNavRaw] = React.useState<NavKey>("dashboard");
  const [premiumModalOpen, setPremiumModalOpen] = React.useState(false);
  const [premiumFeatureName, setPremiumFeatureName] = React.useState("");
  const [settingsTab, setSettingsTab] = React.useState<string | undefined>(undefined);

  const { showOnboarding, completeOnboarding } = useOnboarding();

  // Init analytics
  React.useEffect(() => { initAnalytics(); }, []);

  const setNav = React.useCallback((key: NavKey) => {
    trackNavigation(nav, key);
    trackPageView(key);
    if (key !== "settings") setSettingsTab(undefined);
    setNavRaw(key);
  }, [nav]);

  const { profile, updatePlan } = useUserProfile(auth?.user?.id);

  // Trial logic: auto-downgrade if trial expired
  const isTrialActive = React.useMemo(() => {
    if (!profile?.current_period_end) return false;
    return new Date(profile.current_period_end) > new Date();
  }, [profile?.current_period_end]);

  const trialDaysLeft = React.useMemo(() => {
    if (!profile?.current_period_end) return 0;
    const diff = new Date(profile.current_period_end).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [profile?.current_period_end]);

  // If trial expired, auto-downgrade
  React.useEffect(() => {
    if (profile && profile.plan === "pro" && !isTrialActive && profile.subscription_status === "inactive") {
      updatePlan("free" as any);
    }
  }, [profile, isTrialActive, updatePlan]);

  const userPlan = profile?.plan ?? "free";
  const userRole = profile?.role ?? "user";

  const requirePremium = React.useCallback((featureName: string): boolean => {
    if (userPlan !== "free") return false;
    setPremiumFeatureName(featureName);
    setPremiumModalOpen(true);
    return true;
  }, [userPlan]);

  // Alert days before config
  const LS_ALERT_DAYS = "finbrasil.settings.alertDaysBefore";
  const [alertDaysBefore, setAlertDaysBefore] = React.useState<number>(() => {
    try {
      const raw = localStorage.getItem("finbrasil.settings.alertDaysBefore");
      const v = raw ? parseInt(raw, 10) : 3;
      return [1, 2, 3, 5, 7].includes(v) ? v : 3;
    } catch { return 3; }
  });

  const alertCount = useUpcomingAlertCount(store.expenses ?? [], alertDaysBefore);
  const navBadges = React.useMemo<Partial<Record<NavKey, number>>>(() => {
    if (alertCount <= 0) return {};
    return { expenses: alertCount };
  }, [alertCount]);

  const allCategories = React.useMemo(
    () => [...DEFAULT_CATEGORIES, ...(store.customCategories ?? [])],
    [store.customCategories]
  );

  const pageTitle = React.useMemo(() => NAV_LABELS[nav] ?? "FinBrasil", [nav]);

  const onNewExpense = React.useCallback(() => {
    trackFeatureUsage("add_expense");
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
    reports: "Gráficos e análises detalhadas",
    goals: "Defina e acompanhe seus objetivos",
    settings: "Preferências, segurança e dados",
  };

  // Alert quick actions
  const handleMarkPaid = React.useCallback((id: string) => {
    store.updateExpense(id, { status: "paid" as const });
  }, [store]);

  const handlePostpone = React.useCallback((id: string, days: number) => {
    const exp = (store.expenses ?? []).find((e: Expense) => e.id === id);
    if (!exp) return;
    const [y, m, d] = exp.date.split("-").map(Number);
    const newDate = new Date(y, m - 1, d + days);
    const pad = (n: number) => String(n).padStart(2, "0");
    const dateStr = `${newDate.getFullYear()}-${pad(newDate.getMonth() + 1)}-${pad(newDate.getDate())}`;
    store.updateExpense(id, { date: dateStr });
  }, [store]);

  const handleEditFromAlert = React.useCallback((expense: Expense) => {
    setNav("expenses");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("edit-expense", { detail: expense }));
    }, 100);
  }, []);

  const handleDuplicateExpense = React.useCallback((expense: Expense) => {
    const { id, ...rest } = expense;
    store.addExpense({ ...rest, description: `${rest.description} (cópia)` });
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
              alertDaysBefore={alertDaysBefore}
              onMarkPaid={handleMarkPaid}
              onPostpone={handlePostpone}
              onEditExpense={handleEditFromAlert}
              onDuplicateExpense={handleDuplicateExpense}
              showMonthlyReport={userPlan !== "free"}
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

      case "reports":
        return (
          <PageShell title="Relatórios" subtitle={subtitleByNav.reports}>
            <div className="space-y-5">
              <SmartAlerts
                expenses={store.expenses}
                prevMonthExpenses={store.prevMonthExpenses}
                budget={store.budget}
                monthBalance={store.monthBalance}
              />
              <ReportsPage
                expenses={store.expenses}
                prevMonthExpenses={store.prevMonthExpenses}
                currentDate={store.currentDate}
                monthBalance={store.monthBalance}
                salary={store.salary?.amount}
                extraIncomes={store.extraIncomes}
              />
            </div>
          </PageShell>
        );

      case "goals":
        return (
          <PageShell title="Metas" subtitle={subtitleByNav.goals}>
            <FinancialGoals userId={auth?.user?.id} />
          </PageShell>
        );

      case "settings":
        return (
          <PageShell title="Ajustes" subtitle={subtitleByNav.settings}>
            <div className="space-y-5">
              <CSVImporter
                accounts={(store.financialAccounts ?? []).map((a: any) => ({ id: a.id, name: a.name }))}
                categories={allCategories}
                onImport={(items) => {
                  items.forEach((item: any) => store.addExpense(item));
                }}
              />
              <SettingsPage
                store={store}
                auth={auth}
                userPlan={userPlan}
                userRole={userRole}
                alertDaysBefore={alertDaysBefore}
                setAlertDaysBefore={setAlertDaysBefore}
                initialTab={settingsTab}
              />
              {(userRole === "admin" || userRole === "owner") && (
                <AnalyticsDashboard />
              )}
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
    alertDaysBefore,
    handleMarkPaid,
    handlePostpone,
    handleEditFromAlert,
    handleDuplicateExpense,
    userPlan,
    userRole,
    auth,
  ]);

  const planLabelText = userPlan === "pro" ? "Plano: Inteligente" : userPlan === "ultra" ? "Plano: Elite" : "Plano: Essencial";

  const rightActions = (
    <>
      <MonthNavigator currentDate={store.currentDate} onNavigate={store.navigateMonth} />

      <Button
        variant="outline"
        className="h-10 gap-2 rounded-xl"
        onClick={() => {
          if (requirePremium("Assistente financeiro com IA")) return;
          setAssistantOpen(true);
        }}
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

  const mobileActions = (
    <>
      <MonthNavigator currentDate={store.currentDate} onNavigate={store.navigateMonth} />
      <ModeToggle />
      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl" onClick={signOut}>
        <LogOut className="h-4 w-4" />
      </Button>
    </>
  );

  return (
    <>
      {showOnboarding && <OnboardingTour onComplete={completeOnboarding} />}

      <PremiumModal
        open={premiumModalOpen}
        onOpenChange={setPremiumModalOpen}
        featureName={premiumFeatureName}
        onViewPlans={() => { setSettingsTab("plans"); setNav("settings"); }}
      />
      <AssistantPanel
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        financialContext={{
          income: store.monthBalance?.income ?? 0,
          balance: store.monthBalance?.balance ?? 0,
          totalExpenses: (store.expenses ?? []).reduce((s: number, e: any) => s + (e.amount ?? 0), 0),
          budgetTotal: store.budget?.total ?? 0,
          expenseCount: (store.expenses ?? []).length,
          accountCount: (store.financialAccounts ?? []).length,
          cardCount: (store.creditCards ?? []).length,
          plan: userPlan,
        }}
        onDataChanged={() => {
          store.forceRefresh?.();
          toast.success("Dados registrados pelo assistente!");
        }}
      />

      <AppShell
        active={nav}
        onNavigate={setNav}
        title={pageTitle}
        rightActions={rightActions}
        mobileActions={mobileActions}
        onNewExpense={onNewExpense}
        badges={navBadges}
        planLabel={isTrialActive && trialDaysLeft > 0 ? `Trial Pro: ${trialDaysLeft}d restantes` : planLabelText}
        onPlanClick={() => { setSettingsTab("plans"); setNav("settings"); }}
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