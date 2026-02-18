import { useExpenseStore } from "@/hooks/useExpenseStore";
import { useAuth } from "@/hooks/useAuth";
import { Dashboard } from "@/components/Dashboard";
import { ExpenseTable } from "@/components/ExpenseTable";
import { BudgetSettings } from "@/components/BudgetSettings";
import { RecurringExpenses } from "@/components/RecurringExpenses";
import { FinancialCalendar } from "@/components/FinancialCalendar";
import { CreditCardManager } from "@/components/CreditCardManager";
import { MonthNavigator } from "@/components/MonthNavigator";
import { ModeToggle } from "@/components/ModeToggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, TableProperties, Settings2, LogOut, RefreshCw, Calendar as CalendarIcon, CreditCard as CardIcon } from "lucide-react";
import { InvoiceAlerts } from "@/components/InvoiceAlerts";

const Index = () => {
  const store = useExpenseStore();
  const { signOut } = useAuth();

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
    <div className="min-h-screen bg-background transition-colors duration-300">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            💰 Controle de Gastos
          </h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <MonthNavigator currentDate={store.currentDate} onNavigate={store.navigateMonth} />
            <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />
            <div className="flex items-center gap-1">
              <ModeToggle />
              <Button variant="ghost" size="icon" onClick={signOut} title="Sair" className="h-9 w-9 rounded-full">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
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
            <TabsTrigger value="budget" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Renda Mensal</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Calendário</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard
              expenses={store.expenses}
              budget={store.budget}
              prevMonthExpenses={store.prevMonthExpenses}
              currentDate={store.currentDate}
              cards={store.creditCards}
              invoices={store.invoices}
              historyData={store.historyData}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpenseTable
              expenses={store.expenses}
              customCategories={store.customCategories}
              currentDate={store.currentDate}
              onAdd={store.addExpense}
              onUpdate={store.updateExpense}
              onDelete={store.deleteExpense}
              onAddCategory={store.addCustomCategory}
            />
          </TabsContent>

          <TabsContent value="cards">
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

          <TabsContent value="recurring">
            <RecurringExpenses
              recurringExpenses={store.recurringExpenses}
              customCategories={store.customCategories}
              onAdd={store.addRecurringExpense}
              onToggle={store.toggleRecurringExpense}
              onDelete={store.deleteRecurringExpense}
              onAddCategory={store.addCustomCategory}
            />
          </TabsContent>

          <TabsContent value="budget">
            <BudgetSettings
              budget={store.budget}
              customCategories={store.customCategories}
              onSave={store.setBudget}
            />
          </TabsContent>

          <TabsContent value="calendar">
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
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
