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
import { AssistantPanel } from "@/components/AssistantPanel";
import { PageShell } from "@/components/layout/PageShell";
import { FloatingAddButton } from "@/components/layout/FloatingAddButton";
import { AppShell, NavKey } from "@/components/AppShell";

import { Bot, LogOut } from "lucide-react";

const NAV_LABELS: Record<NavKey, string> = {
  dashboard: "Dashboard",
  expenses: "Gastos",
  income: "Receitas",
  cards: "Cartões",
  recurring: "Recorrentes",
  calendar: "Calendário",
  accounts: "Contas",
  settings: "Ajustes",
};

export default function Index() {
  const { signOut } = useAuth();
  const store = useExpenseStore();

  const [assistantOpen, setAssistantOpen] = React.useState(false);
  const [nav, setNav] = React.useState<NavKey>("dashboard");

  const allCategories = React.useMemo(
    () => [...DEFAULT_CATEGORIES, ...store.customCategories],
    [store.customCategories]
  );

  const pageTitle = React.useMemo(() => NAV_LABELS[nav] ?? "FinBrasil", [nav]);

  const onNewExpense = React.useCallback(() => {
    window.dispatchEvent(new Event("open-add-expense"));
  }, []);

  const subtitleByNav: Record<NavKey, string> = {
    dashboard: "Visão geral do mês e indicadores",
    expenses: "Gerencie e acompanhe suas despesas",
    income: "Registre salários e entradas extras",
    cards: "Controle faturas, compras e parcelas",
    recurring: "Automatize gastos recorrentes",
    calendar: "Visualize seus lançamentos no calendário",
    accounts: "Organize contas, saldos e transferências",
    settings: "Preferências, segurança e dados",
  };

  const Content = React.useMemo(() => {
    switch (nav) {
      case "dashboard":
        return (
          <PageShell title="Dashboard" subtitle={subtitleByNav.dashboard}>
            <Dashboard
              expenses={store.expenses}
              budget={store.budget}
              prevMonthExpenses={store.prevMonthExpenses}
              currentDate={store.currentDate}
              cards={store.creditCards}
              invoices={store.invoices}
              monthBalance={store.monthBalance}
            />
          </PageShell>
        );

      case "expenses":
        return (
          <PageShell title="Gastos" subtitle={subtitleByNav.expenses}>
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
          </PageShell>
        );

      case "income":
        return (
          <PageShell title="Receitas" subtitle={subtitleByNav.income}>
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
          </PageShell>
        );

      case "cards":
        return (
          <PageShell title="Cartões" subtitle={subtitleByNav.cards}>
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
          </PageShell>
        );

      case "recurring":
        return (
          <PageShell title="Recorrentes" subtitle={subtitleByNav.recurring}>
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
          </PageShell>
        );

      case "calendar":
        return (
          <PageShell title="Calendário" subtitle={subtitleByNav.calendar}>
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
          </PageShell>
        );

      case "accounts":
        return (
          <PageShell title="Contas" subtitle={subtitleByNav.accounts}>
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
          </PageShell>
        );

      case "settings":
        return (
          <PageShell title="Ajustes" subtitle={subtitleByNav.settings}>
            {/* DEBUG (pode remover depois): garante que estamos no nav certo */}
            <div className="mb-4 rounded-2xl border border-border/60 bg-card/40 p-3 text-xs text-muted-foreground">
              Debug: nav atual = <span className="font-semibold text-foreground">{nav}</span>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Perfil */}
              <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
                <div className="text-sm font-semibold">Perfil</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Informações básicas da sua conta.
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Nome</div>
                      <div className="text-xs text-muted-foreground">
                        Como você aparece no FinBrasil.
                      </div>
                    </div>
                    <Button variant="outline" className="h-10 rounded-xl">
                      Editar (em breve)
                    </Button>
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Email</div>
                      <div className="text-xs text-muted-foreground">
                        Usado para login e notificações.
                      </div>
                    </div>
                    <Button variant="outline" className="h-10 rounded-xl">
                      Alterar (em breve)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preferências */}
              <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
                <div className="text-sm font-semibold">Preferências</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Personalize a experiência do app.
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Tema</div>
                      <div className="text-xs text-muted-foreground">Claro / Escuro.</div>
                    </div>
                    <ModeToggle />
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Mês financeiro</div>
                      <div className="text-xs text-muted-foreground">
                        Definir início do mês (ex: 5).
                      </div>
                    </div>
                    <Button variant="outline" className="h-10 rounded-xl">
                      Configurar (em breve)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Segurança */}
              <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
                <div className="text-sm font-semibold">Segurança</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Proteja sua conta e seus dados.
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Alterar senha</div>
                      <div className="text-xs text-muted-foreground">
                        Recomendado se usa PC compartilhado.
                      </div>
                    </div>
                    <Button variant="outline" className="h-10 rounded-xl">
                      Trocar (em breve)
                    </Button>
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">2FA</div>
                      <div className="text-xs text-muted-foreground">
                        Autenticação em duas etapas.
                      </div>
                    </div>
                    <Button variant="outline" className="h-10 rounded-xl">
                      Configurar (em breve)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Dados & Plano */}
              <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur">
                <div className="text-sm font-semibold">Dados & Plano</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Exportação, limpeza e upgrades.
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Exportar dados</div>
                      <div className="text-xs text-muted-foreground">CSV para Excel/Sheets.</div>
                    </div>
                    <Button
                      variant="outline"
                      className="h-10 rounded-xl"
                      onClick={() => console.log("export: todo")}
                    >
                      Exportar (em breve)
                    </Button>
                  </div>

                  <div className="h-px bg-border/60" />

                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">Plano</div>
                      <div className="text-xs text-muted-foreground">
                        Preparar monetização (freemium).
                      </div>
                    </div>
                    <Button className="h-10 rounded-xl">Fazer upgrade</Button>
                  </div>
                </div>
              </div>
            </div>
          </PageShell>
        );

      default:
        return null;
    }
  }, [nav, store, allCategories]);

  const rightActions = (
    <>
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
    </>
  );

  return (
    <>
      <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />

      <AppShell
        active={nav}
        onNavigate={setNav}
        title={pageTitle}
        rightActions={rightActions}
        onNewExpense={onNewExpense}
      >
        {Content}
      </AppShell>

      {/* FAB apenas no mobile (evita duplicar com o botão da sidebar) */}
      <div className="xl:hidden">
        <FloatingAddButton onClick={onNewExpense} />
      </div>
    </>
  );
}