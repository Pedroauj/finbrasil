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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

import {
  LayoutDashboard,
  TableProperties,
  RefreshCw,
  Calendar as CalendarIcon,
  CreditCard as CardIcon,
  Wallet,
  LogOut,
  Bot,
} from "lucide-react";

import { PageShell } from "@/components/layout/PageShell";
import { FloatingAddButton } from "@/components/layout/FloatingAddButton";
import { AssistantPanel } from "@/components/AssistantPanel";

export default function Index() {
  const { signOut } = useAuth();
  const store = useExpenseStore();
  const [assistantOpen, setAssistantOpen] = React.useState(false);

  const allCategories = React.useMemo(
    () => [...DEFAULT_CATEGORIES, ...store.customCategories],
    [store.customCategories]
  );

  return (
    <PageShell
      title="FinBrasil - Gestão Financeira"
      subtitle="Controle total do seu dinheiro"
      rightSlot={
        <>
          <MonthNavigator
            currentDate={store.currentDate}
            onNavigate={store.navigateMonth}
          />

          <Button
            variant="outline"
            className="gap-2 border-white/10 bg-white/5 hover:bg-white/10"
            onClick={() => setAssistantOpen(true)}
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Assistente</span>
          </Button>

          <ModeToggle />

          <Button
            variant="outline"
            className="gap-2 border-white/10 bg-white/5 hover:bg-white/10"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </>
      }
    >
      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <TableProperties className="h-4 w-4" />
            <span className="hidden sm:inline">Gastos</span>
          </TabsTrigger>
          <TabsTrigger value="cards" className="gap-2">
            <CardIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Cartões</span>
          </TabsTrigger>
          <TabsTrigger value="recurring" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Recorrentes</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Calendário</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Contas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <Dashboard
            expenses={store.expenses}
            budget={store.budget}
            prevMonthExpenses={store.prevMonthExpenses}
            currentDate={store.currentDate}
            cards={store.creditCards}
            invoices={store.invoices}
            monthBalance={store.monthBalance}
          />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="cards" className="space-y-6">
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
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6">
          <RecurringExpenses
            recurringExpenses={store.recurringExpenses}
            customCategories={store.customCategories}
            onAdd={store.addRecurringExpense}
            onToggle={store.toggleRecurringExpense}
            onDelete={store.deleteRecurringExpense}
            onAddCategory={store.addCustomCategory}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <FinancialCalendar
            expenses={store.expenses}
            customCategories={store.customCategories}
            currentDate={store.currentDate}
            onAdd={store.addExpense}
            onUpdate={store.updateExpense}
            onDelete={store.deleteExpense}
            onAddCategory={store.addCustomCategory}
          />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
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
        </TabsContent>
      </Tabs>

      <FloatingAddButton
        onClick={() => window.dispatchEvent(new Event("open-add-expense"))}
      />
    </PageShell>
  );
}
