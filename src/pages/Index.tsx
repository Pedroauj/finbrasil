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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import {
  Bot,
  LogOut,
  User,
  Sliders,
  Shield,
  Bell,
  Database,
  Crown,
  KeyRound,
  Download,
  Trash2,
  Mail,
} from "lucide-react";

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

function SettingsSection({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-2xl border border-border/60 bg-background/40 p-2">
            {icon}
          </div>

          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function SettingRow({
  label,
  hint,
  right,
}: {
  label: string;
  hint?: string;
  right: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="sm:max-w-[360px] w-full sm:w-auto">{right}</div>
    </div>
  );
}

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

      case "settings": {
        // UI pronta (plugável): aqui você liga as ações reais depois.
        const userEmailGuess =
          // caso você tenha algo no useAuth, substitui aqui depois
          (store as any)?.user?.email ?? "";

        return (
          <PageShell title="Ajustes" subtitle={subtitleByNav.settings}>
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Perfil */}
                <SettingsSection
                  title="Perfil"
                  description="Informações básicas da sua conta."
                  icon={<User className="h-5 w-5" />}
                >
                  <SettingRow
                    label="Nome"
                    hint="Como você quer aparecer no FinBrasil."
                    right={<Input placeholder="Seu nome" className="h-10 rounded-xl" />}
                  />
                  <Separator />
                  <SettingRow
                    label="Email"
                    hint="Email usado para login e notificações."
                    right={
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="seuemail@exemplo.com"
                          defaultValue={userEmailGuess}
                          className="h-10 rounded-xl"
                        />
                      </div>
                    }
                  />
                  <Separator />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                      Dica: depois a gente pode conectar isso ao seu cadastro real do auth.
                    </div>
                    <Button variant="outline" className="h-10 rounded-xl">
                      Salvar
                    </Button>
                  </div>
                </SettingsSection>

                {/* Preferências */}
                <SettingsSection
                  title="Preferências"
                  description="Personalize a experiência do app."
                  icon={<Sliders className="h-5 w-5" />}
                >
                  <SettingRow
                    label="Tema"
                    hint="Você já troca no topo, mas pode ficar aqui também."
                    right={<ModeToggle />}
                  />
                  <Separator />
                  <SettingRow
                    label="Mês financeiro"
                    hint="Defina quando seu mês começa (útil para quem recebe dia 5, 10, etc.)."
                    right={
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        placeholder="Ex: 1"
                        className="h-10 rounded-xl"
                      />
                    }
                  />
                  <Separator />
                  <SettingRow
                    label="Privacidade"
                    hint="Ocultar valores por padrão (modo discreto)."
                    right={
                      <Button variant="outline" className="h-10 rounded-xl w-full sm:w-auto">
                        Ativar (em breve)
                      </Button>
                    }
                  />
                </SettingsSection>

                {/* Segurança */}
                <SettingsSection
                  title="Segurança"
                  description="Proteja sua conta e seus dados."
                  icon={<Shield className="h-5 w-5" />}
                >
                  <SettingRow
                    label="Alterar senha"
                    hint="Recomendado se você compartilha o dispositivo."
                    right={
                      <Button className="h-10 rounded-xl w-full sm:w-auto gap-2" variant="outline">
                        <KeyRound className="h-4 w-4" />
                        Trocar senha
                      </Button>
                    }
                  />
                  <Separator />
                  <SettingRow
                    label="2FA"
                    hint="Autenticação em duas etapas (mais segurança)."
                    right={
                      <Button className="h-10 rounded-xl w-full sm:w-auto" variant="outline">
                        Configurar (em breve)
                      </Button>
                    }
                  />
                </SettingsSection>

                {/* Notificações */}
                <SettingsSection
                  title="Notificações"
                  description="Alertas de fatura, vencimentos e resumos."
                  icon={<Bell className="h-5 w-5" />}
                >
                  <SettingRow
                    label="Alertas de vencimento"
                    hint="Receba aviso antes de contas vencerem."
                    right={
                      <Button variant="outline" className="h-10 rounded-xl w-full sm:w-auto">
                        Configurar (em breve)
                      </Button>
                    }
                  />
                  <Separator />
                  <SettingRow
                    label="Resumo mensal"
                    hint="Relatório do mês com gráficos e insights."
                    right={
                      <Button variant="outline" className="h-10 rounded-xl w-full sm:w-auto">
                        Ativar (em breve)
                      </Button>
                    }
                  />
                </SettingsSection>

                {/* Dados */}
                <SettingsSection
                  title="Dados"
                  description="Portabilidade, backup e limpeza."
                  icon={<Database className="h-5 w-5" />}
                >
                  <SettingRow
                    label="Exportar dados"
                    hint="Baixar CSV para Excel/Google Sheets."
                    right={
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl w-full sm:w-auto gap-2"
                        onClick={() => {
                          // TODO: ligar em uma action real depois
                          console.log("export: todo");
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Exportar CSV
                      </Button>
                    }
                  />
                  <Separator />
                  <SettingRow
                    label="Reset financeiro"
                    hint="Limpar lançamentos (ação irreversível)."
                    right={
                      <Button
                        variant="destructive"
                        className="h-10 rounded-xl w-full sm:w-auto gap-2"
                        onClick={() => {
                          // TODO: confirmar com modal depois
                          console.log("reset: todo");
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Resetar
                      </Button>
                    }
                  />
                </SettingsSection>

                {/* Plano */}
                <SettingsSection
                  title="Plano"
                  description="Prepare o FinBrasil para monetização (freemium)."
                  icon={<Crown className="h-5 w-5" />}
                >
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Você está no plano Gratuito</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Em breve: recursos premium como relatórios avançados, metas, alertas
                          inteligentes e exportação completa.
                        </div>
                      </div>
                      <Button className="h-10 rounded-xl">Fazer upgrade</Button>
                    </div>
                  </div>
                </SettingsSection>
              </div>
            </div>
          </PageShell>
        );
      }

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