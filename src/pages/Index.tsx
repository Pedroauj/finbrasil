import * as React from "react";
import { motion } from "framer-motion";

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
  LogOut,
  RefreshCw,
  Calendar as CalendarIcon,
  CreditCard as CardIcon,
  Wallet,
  Bot,
} from "lucide-react";

import { InvoiceAlerts } from "@/components/InvoiceAlerts";
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

  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [tab, setTab] = React.useState<TabValue>("dashboard");

  const activeIndex = React.useMemo(
    () => TAB_ITEMS.findIndex((t) => t.value === tab),
    [tab]
  );

  return (
    <PageShell
      title="FinBrasil - Gestão Financeira"
      subtitle="Controle total do seu dinheiro"
      rightSlot={
        <>
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