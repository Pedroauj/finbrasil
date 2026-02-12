import { useState } from "react";
import { useExpenseStore } from "@/hooks/useExpenseStore";
import { Dashboard } from "@/components/Dashboard";
import { ExpenseTable } from "@/components/ExpenseTable";
import { BudgetSettings } from "@/components/BudgetSettings";
import { MonthNavigator } from "@/components/MonthNavigator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, TableProperties, Settings2 } from "lucide-react";

const Index = () => {
  const store = useExpenseStore();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            💰 Controle de Gastos
          </h1>
          <MonthNavigator currentDate={store.currentDate} onNavigate={store.navigateMonth} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2">
              <TableProperties className="h-4 w-4" />
              <span className="hidden sm:inline">Gastos</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Orçamento</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard
              expenses={store.expenses}
              budget={store.budget}
              prevMonthExpenses={store.prevMonthExpenses}
              currentDate={store.currentDate}
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

          <TabsContent value="budget">
            <BudgetSettings
              budget={store.budget}
              customCategories={store.customCategories}
              onSave={store.setBudget}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
