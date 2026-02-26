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
  TrendingUp,
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
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { value: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { value: "expenses", label: "Gastos", icon: TableProperties },
  { value: "income", label: "Receitas", icon: TrendingUp },
  { value: "cards", label: "Cartões", icon: CardIcon },
  { value: "recurring", label: "Recorrentes", icon: RefreshCw },
  { value: "calendar", label: "Calendário", icon: CalendarIcon },
  { value: "accounts", label: "Contas", icon: Wallet },
] as const;

type NavValue = (typeof NAV_ITEMS)[number]["value"];

// ✅ highlight local (não cria arquivo novo)
function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-primary to-emerald-400 bg-clip-text text-transparent">
      {children}
    </span>
  );
}

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
        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur px-4 py-4 shadow-sm">
          <div className="text-base font-semibold leading-tight">FinBrasil</div>
          <div className="mt-1 text-xs text-muted-foreground">Gestão Financeira</div>
          <div className="mt-2 text-xs text-muted-foreground opacity-80 leading-relaxed">
            Controle total do seu dinheiro
          </div>
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
                data-active={isActive ? "true" : "false"}
                className={cn(
                  "relative group flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition",
                  "hover:bg-muted/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "overflow-hidden",

                  // Aura LED no hover (sutil)
                  "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300",
                  "before:bg-[radial-gradient(200px_circle_at_25%_35%,hsl(var(--primary)/0.12),transparent_65%)]",
                  "hover:before:opacity-100",

                  isActive
                    ? cn(
                      "text-foreground bg-primary/10",
                      "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]",
                      "ring-1 ring-primary/18",

                      // ✅ Soft glow “de fundo” (bem SaaS)
                      "before:opacity-100",
                      "before:bg-[radial-gradient(260px_circle_at_20%_30%,hsl(var(--primary)/0.18),transparent_68%)]",

                      // brilho extra super discreto (tipo bloom)
                      "shadow-[0_14px_40px_-28px_hsl(var(--primary)/0.70)]",

                      // “LED strip” lateral com gradient (mais premium que linha reta)
                      "after:pointer-events-none after:absolute after:left-0 after:top-2 after:bottom-2 after:w-[2px] after:rounded-full",
                      "after:bg-gradient-to-b after:from-transparent after:via-primary after:to-transparent after:opacity-90"
                    )
                    : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span className="flex-1 text-left">{label}</span>

                {/* specular bem leve no hover */}
                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(120px_circle_at_70%_30%,hsl(var(--primary)/0.08),transparent_60%)]" />
              </button>
            );
          })}
        </div>

        {/* ✅ CTA Novo Gasto com gradiente e glow premium */}
        <div className="mt-4 px-1">
          <Button
            onClick={onNewExpense}
            className={cn(
              "group relative h-11 w-full rounded-2xl font-semibold shadow-sm",
              "overflow-hidden",
              "bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground",
              "hover:brightness-[1.03] active:brightness-[0.98]",
              "transition-all"
            )}
          >
            {/* glow externo no hover */}
            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/25 blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* brilho “sheen” passando (bem sutil) */}
            <span className="pointer-events-none absolute -left-16 top-0 h-full w-24 rotate-12 bg-white/10 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <span className="relative flex items-center justify-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-black/10 ring-1 ring-white/15">
                <Plus className="h-4 w-4 text-white" />
              </span>
              <span>Novo gasto</span>
            </span>
          </Button>
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
          </div>
        );

      case "income":
        return (
          <div className="space-y-5">
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
      {/* ✅ Background com feixe de luz (INLINE CSS = não quebra build) */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {/* Feixe principal (esquerda) */}
        <div
          className="absolute -left-40 top-0 h-[900px] w-[900px] blur-[140px]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.20), transparent 65%)",
          }}
        />

        {/* Glow secundário */}
        <div
          className="absolute right-[-250px] top-[-150px] h-[700px] w-[700px] blur-[150px]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 70% 20%, hsl(var(--primary) / 0.10), transparent 70%)",
          }}
        />

        {/* Wash ambiente */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, hsl(var(--primary) / 0.06), transparent 60%)",
          }}
        />

        {/* Vinheta */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, transparent 55%, hsl(var(--background)) 95%)",
            opacity: 0.9,
          }}
        />

        {/* Grain */}
        <div className="absolute inset-0 opacity-[0.05] mix-blend-soft-light bg-[url('/noise.png')]" />
      </div>

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
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Mobile menu */}
              <div className="xl:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <SidebarNav active={nav} onNavigate={setNav} onNewExpense={onNewExpense} />
                  </SheetContent>
                </Sheet>
              </div>

              {/* ✅ Título com palavra destacada */}
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  <Highlight>{pageTitle}</Highlight>
                </h1>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                <MonthNavigator currentDate={store.currentDate} onNavigate={store.navigateMonth} />

                <Button
                  variant="outline"
                  className="h-10 gap-2 rounded-xl"
                  onClick={() => setAssistantOpen(true)}
                >
                  <Bot className="h-4 w-4" />
                  <span className="hidden sm:inline">Assistente</span>
                </Button>

                <ModeToggle />

                <Button variant="outline" className="h-10 gap-2 rounded-xl" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="relative flex-1 px-4 py-5 sm:px-5">
            {/* ✅ Floor glow local (inline para não quebrar build) */}
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-[32px]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 10%, hsl(var(--primary) / 0.08), transparent 55%)",
              }}
            />
            {Content}
          </main>
        </div>
      </div>

      {/* FAB apenas no mobile (evita duplicar com o botão da sidebar) */}
      <div className="xl:hidden">
        <FloatingAddButton onClick={onNewExpense} />
      </div>
    </div>
  );
}