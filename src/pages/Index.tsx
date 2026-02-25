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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import {
  LayoutDashboard,
  TableProperties,
  RefreshCw,
  Calendar as CalendarIcon,
  CreditCard as CardIcon,
  Wallet,
  LogOut,
  Bot,
  Menu,
  Plus,
} from "lucide-react";

import { FloatingAddButton } from "@/components/layout/FloatingAddButton";
import { AssistantPanel } from "@/components/AssistantPanel";

const NAV_ITEMS = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "expenses", label: "Gastos", icon: TableProperties },
  { value: "cards", label: "Cartões", icon: CardIcon },
  { value: "recurring", label: "Recorrentes", icon: RefreshCw },
  { value: "calendar", label: "Calendário", icon: CalendarIcon },
  { value: "accounts", label: "Contas", icon: Wallet },
] as const;

type NavValue = (typeof NAV_ITEMS)[number]["value"];

function SidebarNav({
  active,
  onNavigate,
  onNewExpense,
}: {
  active: NavValue;
  onNavigate: (v: NavValue) => void;
  onNewExpense: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="p-4">
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur px-4 py-3 shadow-sm">
          <div className="text-sm font-semibold leading-tight">FinBrasil</div>
          <div className="text-xs text-muted-foreground">Gestão Financeira</div>
        </div>
      </div>

      {/* Nav */}
      <div className="px-3">
        <div className="space-y-1">
          {NAV_ITEMS.map(({ value, label, icon: Icon }) => {
            const isActive = active === value;

            return (
              <button
                key={value}
                onClick={() => onNavigate(value)}
                className={[
                  "relative group flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition",
                  "hover:bg-muted/50",
                  // premium feel
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  isActive
                    ? [
                      "text-foreground",
                      "bg-primary/10",
                      "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]",
                      // barrinha fina + elegante
                      "before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full before:bg-primary before:opacity-90",
                    ].join(" ")
                    : "text-muted-foreground",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-4 w-4 transition",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  ].join(" ")}
                />
                <span className="flex-1 text-left">{label}</span>

                {/* micro brilho no hover (bem sutil) */}
                <span className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(120px_circle_at_30%_40%,hsl(var(--primary)/0.10),transparent_65%)]" />
              </button>
            );
          })}
        </div>

        {/* ✅ Botão Novo Gasto abaixo das abas */}
        <div className="mt-4 px-1">
          <Button
            onClick={onNewExpense}
            className="group relative h-11 w-full rounded-2xl font-semibold shadow-sm"
          >
            {/* glow sutil premium */}
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="relative flex items-center justify-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                <Plus className="h-4 w-4 text-primary-foreground" />
              </span>
              <span>Novo gasto</span>
            </span>
          </Button>
        </div>
      </div>

      {/* Bottom */}
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-border/50 bg-card/40 px-4 py-3 text-xs text-muted-foreground">
          Controle total do seu dinheiro
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const { signOut } = useAuth();
  const store = useExpenseStore();

  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [nav, setNav] = React.useState<NavValue>("dashboard");

  const allCategories = React.useMemo(
    () => [...DEFAULT_CATEGORIES, ...store.customCategories],
    [store.customCategories]
  );

  const pageTitle = React.useMemo(() => {
    const found = NAV_ITEMS.find((i) => i.value === nav);
    return found?.label ?? "FinBrasil";
  }, [nav]);

  const onNewExpense = React.useCallback(() => {
    window.dispatchEvent(new Event("open-add-expense"));
    // se quiser: setNav("expenses"); (eu não forcei pra não “pular tela”)
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      {/* background premium sutil */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_20%_10%,hsl(var(--primary)/0.08),transparent_60%),radial-gradient(900px_circle_at_80%_20%,hsl(var(--ring)/0.05),transparent_55%)]" />

      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        {/* Sidebar desktop */}
        <aside className="hidden w-72 bg-background/60 backdrop-blur xl:block shadow-[1px_0_0_hsl(var(--border)/0.25)]">
          <SidebarNav active={nav} onNavigate={setNav} onNewExpense={onNewExpense} />
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-20 bg-background/70 backdrop-blur shadow-[0_1px_0_hsl(var(--border)/0.25)]">
            <div className="flex items-center gap-3 px-4 py-2.5">
              {/* Mobile menu */}
              <div className="xl:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <SidebarNav active={nav} onNavigate={setNav} onNewExpense={onNewExpense} />
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex-1">
                <div className="text-sm font-semibold">{pageTitle}</div>
                <div className="text-xs text-muted-foreground">
                  FinBrasil — Gestão Financeira
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                <MonthNavigator
                  currentDate={store.currentDate}
                  onNavigate={store.navigateMonth}
                />

                <Button
                  variant="outline"
                  className="gap-2 rounded-xl h-10"
                  onClick={() => setAssistantOpen(true)}
                >
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">Assistente</span>
                </Button>

                <ModeToggle />

                <Button
                  variant="outline"
                  className="gap-2 rounded-xl h-10"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 sm:px-5 py-5">{Content}</main>
        </div>
      </div>

      {/* ✅ FAB apenas no mobile (evita duplicar com o botão da sidebar) */}
      <div className="xl:hidden">
        <FloatingAddButton onClick={onNewExpense} />
      </div>
    </div>
  );
}