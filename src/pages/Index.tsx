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
  onAddExpense,
}: {
  active: NavValue;
  onNavigate: (v: NavValue) => void;
  onAddExpense: () => void;
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

      {/* Nav + Primary action */}
      <div className="px-3">
        <div className="space-y-2">
          {/* Primary button (lateral) */}
          <Button
            onClick={onAddExpense}
            className="h-11 w-full justify-between rounded-2xl px-4 font-semibold shadow-sm"
          >
            <span>Novo gasto</span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
              <Plus className="h-4 w-4 text-primary-foreground" />
            </span>
          </Button>

          {/* Nav list */}
          <div className="space-y-1">
            {NAV_ITEMS.map(({ value, label, icon: Icon }) => {
              const isActive = active === value;
              return (
                <button
                  key={value}
                  onClick={() => onNavigate(value)}
                  className={[
                    "group flex w-full items-center gap-2 rounded-2xl px-3",
                    "h-11 text-sm transition",
                    "hover:bg-muted/50",
                    isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-4 w-4 transition",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                    ].join(" ")}
                  />
                  <span className="flex-1 text-left">{label}</span>
                </button>
              );
            })}
          </div>
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

  const openAddExpense = React.useCallback(() => {
    window.dispatchEvent(new Event("open-add-expense"));
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
          <SidebarNav active={nav} onNavigate={setNav} onAddExpense={openAddExpense} />
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
                    <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <SidebarNav active={nav} onNavigate={setNav} onAddExpense={openAddExpense} />
                  </SheetContent>
                </Sheet>
              </div>

              <div className="flex-1">
                <div className="text-sm font-semibold">{pageTitle}</div>
                <div className="text-xs text-muted-foreground">FinBrasil — Gestão Financeira</div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                <MonthNavigator currentDate={store.currentDate} onNavigate={store.navigateMonth} />

                <Button
                  variant="outline"
                  className="h-11 gap-2 rounded-2xl px-4"
                  onClick={() => setAssistantOpen(true)}
                >
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">Assistente</span>
                </Button>

                <ModeToggle />

                <Button variant="outline" className="h-11 gap-2 rounded-2xl px-4" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 py-5 sm:px-5">{Content}</main>
        </div>
      </div>

      {/* FAB só no mobile/tablet (porque no desktop já tem o botão na sidebar) */}
      <div className="xl:hidden">
        <FloatingAddButton onClick={openAddExpense} />
      </div>
    </div>
  );
}