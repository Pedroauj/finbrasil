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
import { FloatingAddButton } from "@/components/layout/FloatingAddButton";
import { AppShell, NavKey } from "@/components/AppShell";

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

export default function Index() {
  const { signOut } = useAuth();
  const store = useExpenseStore();

  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [nav, setNav] = React.useState<NavKey>("dashboard");

  const allCategories = React.useMemo(
    () => [...DEFAULT_CATEGORIES, ...store.customCategories],
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
    settings: "Preferências e configurações",
  };

  const Content = React.useMemo(() => {
    switch (nav) {
      case "dashboard":
        return (
          <Dashboard
            expenses={store.expenses}
            budget={store.budget}
            prevMonthExpenses={store.prevMonthExpenses}
            currentDate={store.currentDate}
            cards={store.creditCards}
            invoices={store.invoices}
            monthBalance={store.monthBalance}
          />
        );

      case "expenses":
        return (
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
        );

      case "income":
        return (
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
        );

      case "cards":
        return (
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
        );

      case "recurring":
        return (
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
        );

      case "calendar":
        return (
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
        );

      case "accounts":
        return (
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
        );

      default:
        return null;
    }
  }, [nav, store, allCategories]);

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
        <div className="mb-5">
          <div className="text-2xl font-bold tracking-tight">{pageTitle}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {subtitleByNav[nav]}
          </div>
        </div>

        {Content}
      </AppShell>

      {/* FAB apenas no mobile (evita duplicar com o botão da sidebar) */}
      <div className="xl:hidden">
        <FloatingAddButton onClick={onNewExpense} />
      </div>
    </>
  );
}