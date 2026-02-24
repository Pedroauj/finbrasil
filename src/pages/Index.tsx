import * as React from "react";

import { motion } from "framer-motion";

489e63fe15ed92c5982d1413edd36868aab287f5

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
  LogOut,

489e63fe15ed92c5982d1413edd36868aab287f5
RefreshCw,
  Calendar as CalendarIcon,
  CreditCard as CardIcon,
  Wallet,
  Bot,
} from "lucide-react";

import { InvoiceAlerts } from "@/components/InvoiceAlerts";
LogOut,
  Bot,
} from "lucide-react";

489e63fe15ed92c5982d1413edd36868aab287f5
import { PageShell } from "@/components/layout/PageShell";
import { FloatingAddButton } from "@/components/layout/FloatingAddButton";
import { AssistantPanel } from "@/components/AssistantPanel";

const TAB_ITEMS = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "expenses", label: "Gastos", icon: TableProperties },
  { value: "cards", label: "Cartões", icon: CardIcon },
  { value: "recurring", label: "Recorrentes", icon: RefreshCw },
  { value: "calendar", label: "Calendário", icon: CalendarIcon },
  { value: "accounts", label: "Contas", icon: Wallet },
] as const;

type TabValue = (typeof TAB_ITEMS)[number]["value"];

export default function Index() {
  const { signOut } = useAuth();


  const store = useExpenseStore();
  489e63fe15ed92c5982d1413edd36868aab287f5
  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [tab, setTab] = React.useState<TabValue>("dashboard");

  const activeIndex = React.useMemo(
    () => TAB_ITEMS.findIndex((t) => t.value === tab),
    [tab]
  );

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

          <MonthNavigator />
          <MonthNavigator
            currentDate={store.currentDate}
            onNavigate={store.navigateMonth}
          />
          489e63fe15ed92c5982d1413edd36868aab287f5

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

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="space-y-6">
        {/* Tabs premium + indicador animado */}
        <div className="relative">
          <TabsList
            className="
              relative grid w-full grid-cols-3 sm:grid-cols-6
              rounded-2xl border border-white/10
              bg-white/5 backdrop-blur-xl
              p-1
              lg:w-auto lg:inline-grid
            "
          >
            {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="
                  relative gap-2 rounded-xl
                  text-white/70
                  transition-all
                  data-[state=active]:text-emerald-300
                  data-[state=active]:bg-white/0
                  hover:text-white
                "
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </TabsTrigger>
            ))}

            {/* Indicador deslizante (underline) */}
            <motion.div
              className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-[calc(100%/3)] sm:w-[calc(100%/6)] bg-emerald-400/80"
              animate={{
                x: `calc(${activeIndex} * 100%)`,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 36 }}
            />
          </TabsList>
        </div>

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
          489e63fe15ed92c5982d1413edd36868aab287f5

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
