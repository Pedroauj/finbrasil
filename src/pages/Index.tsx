import * as React from "react";
import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";

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
  Bot,
} from "lucide-react";

import { InvoiceAlerts } from "@/components/InvoiceAlerts";
import { FadeIn } from "@/components/ui/animations";
import { PageShell } from "@/components/layout/PageShell";
import { FloatingAddButton } from "@/components/layout/FloatingAddButton";

import { AssistantPanel } from "@/components/AssistantPanel";

export default function Index() {
  const { signOut } = useAuth();

  // Se você já usa algum state pra tabs, mantém o seu
  const [assistantOpen, setAssistantOpen] = React.useState(false);

  return (
    <PageShell
      title="FinBrasil - Gestão Financeira"
      subtitle="Controle total do seu dinheiro"
      rightSlot={
        <>
          {/* Você pode manter MonthNavigator/ModeToggle aqui no topo */}
          <MonthNavigator />

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
      {/* ✅ O painel do assistente fica aqui (integrado ao app, sem flutuar) */}
      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />

      {/* Aqui fica o resto do seu conteúdo, tabs, etc */}
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
          <InvoiceAlerts />
          <Dashboard />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <ExpenseTable />
          <IncomeManager />
        </TabsContent>

        <TabsContent value="cards" className="space-y-6">
          <CreditCardManager />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6">
          <RecurringExpenses />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <FinancialCalendar />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <AccountManager />
        </TabsContent>
      </Tabs>

      <FloatingAddButton />
    </PageShell>
  );
}