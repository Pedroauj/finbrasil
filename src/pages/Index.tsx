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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  TableProperties,
  Settings2,
  LogOut,
  RefreshCw,
  Calendar as CalendarIcon,
  CreditCard as CardIcon,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { InvoiceAlerts } from "@/components/InvoiceAlerts";
import { FadeIn } from "@/components/ui/animations";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { PageShell } from "@/components/layout/PageShell";

const Index = () => {
  const store = useExpenseStore();
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  const categories = [
    "Alimentação",
    "Transporte",
    "Moradia",
    "Saúde",
    "Lazer",
    "Educação",
    "Outros",
    ...store.customCategories,
  ];

  const tabs = [
    { value: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { value: "expenses", label: "Gastos", Icon: TableProperties },
    { value: "accounts", label: "Contas", Icon: Wallet },
    { value: "cards", label: "Cartões", Icon: CardIcon },
    { value: "recurring", label: "Recorrentes", Icon: RefreshCw },
    { value: "budget", label: "Renda", Icon: Settings2 },
    { value: "calendar", label: "Calendário", Icon: CalendarIcon },
  ] as const;

  // Trigger com alinhamento perfeito + suporte ao "pill" animado
  const tabTriggerClass =
    "relative flex h-full items-center justify-center gap-2 rounded-xl py-0 leading-none " +
    "transition-colors duration-200 " +
    "text-white/70 hover:text-white " +
    "data-[state=active]:text-slate-950";

  return (
    <PageShell
      title="FinBrasil"
      subtitle="Gestão Financeira"
      rightSlot={
        <div className="flex items-center gap-2">
          <MonthNavigator
            currentDate={store.currentDate}
            onNavigate={store.navigateMonth}
          />
          <div className="hidden h-6 w-[1px] bg-white/10 sm:block" />
          <ModeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            title="Sair"
            className="h-9 w-9 rounded-xl text-white/80 hover:bg-red-500/10 hover:text-red-400 transition-colors duration-200"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      {/* Header interno (glass) — opcional */}
      <header className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <FadeIn className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/20">
              <TrendingUp className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl text-white/90">
                FinBrasil
              </h1>
              <p className="hidden text-[10px] font-medium uppercase tracking-widest text-white/50 sm:block">
                Gestão Financeira
              </p>
            </div>
          </FadeIn>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <FadeIn delay={0.15}>
          <TabsList className="grid h-12 w-full grid-cols-7 items-center gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur-xl sm:w-auto sm:inline-grid">
            {tabs.map(({ value, label, Icon }) => (
              <TabsTrigger key={value} value={value} className={tabTriggerClass}>
                {/* Indicador animado (PILL) */}
                {activeTab === value && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-xl bg-emerald-500 shadow-md"
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                  />
                )}

                {/* Conteúdo sempre acima do pill */}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">{label}</span>
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </FadeIn>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <TabsContent value="dashboard" className="mt-0">
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

            <TabsContent value="expenses" className="mt-0">
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
            </TabsContent>

            <TabsContent value="accounts" className="mt-0">
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

            <TabsContent value="cards" className="mt-0">
              <div className="space-y-6">
                <InvoiceAlerts
                  cards={store.creditCards}
                  invoices={store.invoices}
                  currentDate={store.currentDate}
                />
                <CreditCardManager
                  cards={store.creditCards}
                  invoices={store.invoices}
                  categories={categories}
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
            </TabsContent>

            <TabsContent value="recurring" className="mt-0">
              <RecurringExpenses
                recurringExpenses={store.recurringExpenses}
                customCategories={store.customCategories}
                onAdd={store.addRecurringExpense}
                onToggle={store.toggleRecurringExpense}
                onDelete={store.deleteRecurringExpense}
                onAddCategory={store.addCustomCategory}
              />
            </TabsContent>

            <TabsContent value="budget" className="mt-0">
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

            <TabsContent value="calendar" className="mt-0">
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
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </PageShell>
  );
};

export default Index;