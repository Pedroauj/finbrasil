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
import { LayoutDashboard, TableProperties, Settings2, LogOut, RefreshCw, Calendar as CalendarIcon, CreditCard as CardIcon, Wallet, TrendingUp } from "lucide-react";
import { InvoiceAlerts } from "@/components/InvoiceAlerts";
import { FadeIn, PageTransition } from "@/components/ui/animations";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

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

  return (
    <div className="min-h-screen bg-background transition-colors duration-500">
      {/* Header com glass effect */}
      <header className="sticky top-0 z-50 glass">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <FadeIn className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                FinBrasil
              </h1>
              <p className="hidden text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:block">
                Gestão Financeira
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={0.1} className="flex items-center gap-2 sm:gap-3">
            <MonthNavigator currentDate={store.currentDate} onNavigate={store.navigateMonth} />
            <div className="h-6 w-[1px] bg-border/50 mx-1 hidden sm:block" />
            <div className="flex items-center gap-1">
              <ModeToggle />
              <Button variant="ghost" size="icon" onClick={signOut} title="Sair" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors duration-200">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </FadeIn>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <FadeIn delay={0.15}>
            <TabsList className="grid w-full grid-cols-7 rounded-2xl bg-muted/60 p-1.5 backdrop-blur-sm sm:w-auto sm:inline-grid">
              <TabsTrigger value="dashboard" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="expenses" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                <TableProperties className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Gastos</span>
              </TabsTrigger>
              <TabsTrigger value="accounts" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Contas</span>
              </TabsTrigger>
              <TabsTrigger value="cards" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                <CardIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Cartões</span>
              </TabsTrigger>
              <TabsTrigger value="recurring" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Recorrentes</span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Renda</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline text-sm">Calendário</span>
              </TabsTrigger>
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
                  <InvoiceAlerts cards={store.creditCards} invoices={store.invoices} currentDate={store.currentDate} />
                  <CreditCardManager
                    cards={store.creditCards}
                    invoices={store.invoices}
                    categories={categories}
                    currentDate={store.currentDate}
                    onAddCard={store.addCreditCard}
                    onDeleteCard={store.deleteCreditCard}
                    onAddInvoiceItem={store.addInvoiceItem}
                    onRemoveInvoiceItem={store.removeInvoiceItem}
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
      </main>
    </div>
  );
};

export default Index;