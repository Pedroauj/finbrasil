import { useEffect, useState, useMemo, useCallback } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  TableProperties,
  TrendingUp,
  Wallet,
  CreditCard,
  RefreshCw,
  Calendar,
  LayoutDashboard,
  Target,
  BarChart3,
  Settings2,
  Users,
  PiggyBank,
  Layers,
  Activity,
  ArrowRight,
} from "lucide-react";
import type { Expense, FinancialAccount } from "@/types/expense";
import { formatCurrency } from "@/types/expense";
import type { NavKey } from "@/components/AppShell";

interface SearchableItem {
  id: string;
  type: "expense" | "income" | "account" | "nav";
  title: string;
  subtitle?: string;
  amount?: number;
  date?: string;
  navKey?: NavKey;
  icon?: React.ElementType;
}

interface GlobalSearchProps {
  expenses: Expense[];
  extraIncomes: Array<{ id: string; description: string; amount: number; date: string; category: string }>;
  accounts: FinancialAccount[];
  salaries: Array<{ id: string; amount: number; month: number; year: number }>;
  onNavigate: (nav: NavKey) => void;
  onSelectExpense?: (expense: Expense) => void;
}

const NAV_ITEMS: Array<{ key: NavKey; label: string; icon: React.ElementType }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "expenses", label: "Gastos", icon: TableProperties },
  { key: "income", label: "Receitas", icon: TrendingUp },
  { key: "cards", label: "Cartões", icon: CreditCard },
  { key: "recurring", label: "Recorrentes", icon: RefreshCw },
  { key: "installments", label: "Parcelas", icon: Layers },
  { key: "calendar", label: "Calendário", icon: Calendar },
  { key: "accounts", label: "Contas", icon: Wallet },
  { key: "networth", label: "Patrimônio", icon: PiggyBank },
  { key: "reports", label: "Relatórios", icon: BarChart3 },
  { key: "comparative", label: "Comparativo", icon: Activity },
  { key: "goals", label: "Metas", icon: Target },
  { key: "family", label: "Família", icon: Users },
  { key: "settings", label: "Ajustes", icon: Settings2 },
];

function formatDateBR(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function GlobalSearch({
  expenses,
  extraIncomes,
  accounts,
  salaries,
  onNavigate,
  onSelectExpense,
}: GlobalSearchProps) {
  const [open, setOpen] = useState(false);

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = useCallback(
    (item: SearchableItem) => {
      setOpen(false);
      if (item.type === "nav" && item.navKey) {
        onNavigate(item.navKey);
      } else if (item.type === "expense") {
        onNavigate("expenses");
        // Small delay to let the expenses tab mount
        const exp = expenses.find((e) => e.id === item.id);
        if (exp && onSelectExpense) {
          setTimeout(() => onSelectExpense(exp), 200);
        }
      } else if (item.type === "income") {
        onNavigate("income");
      } else if (item.type === "account") {
        onNavigate("accounts");
      }
    },
    [expenses, onNavigate, onSelectExpense]
  );

  // Memoize searchable items
  const expenseItems: SearchableItem[] = useMemo(
    () =>
      (expenses ?? []).slice(0, 200).map((e) => ({
        id: e.id,
        type: "expense" as const,
        title: e.description,
        subtitle: `${e.category} • ${formatDateBR(e.date)}`,
        amount: e.amount,
        date: e.date,
      })),
    [expenses]
  );

  const incomeItems: SearchableItem[] = useMemo(
    () =>
      (extraIncomes ?? []).slice(0, 100).map((i) => ({
        id: i.id,
        type: "income" as const,
        title: i.description,
        subtitle: `${i.category} • ${formatDateBR(i.date)}`,
        amount: i.amount,
        date: i.date,
      })),
    [extraIncomes]
  );

  const accountItems: SearchableItem[] = useMemo(
    () =>
      (accounts ?? []).map((a) => ({
        id: a.id,
        type: "account" as const,
        title: a.name,
        subtitle: a.type,
        amount: a.balance,
      })),
    [accounts]
  );

  const navItems: SearchableItem[] = useMemo(
    () =>
      NAV_ITEMS.map((n) => ({
        id: `nav-${n.key}`,
        type: "nav" as const,
        title: `Ir para ${n.label}`,
        navKey: n.key,
        icon: n.icon,
      })),
    []
  );

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-xl border border-border/40 bg-card/60 backdrop-blur-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40 hover:border-border/60 transition-all duration-200 shadow-sm"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Buscar...</span>
        <kbd className="ml-2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md border border-border/50 bg-muted/30 px-1.5 font-mono text-[10px] font-medium text-muted-foreground/70">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar despesas, receitas, contas ou navegar..." />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          {/* Navigation */}
          <CommandGroup heading="Navegação">
            {navItems.map((item) => {
              const Icon = item.icon ?? ArrowRight;
              return (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => handleSelect(item)}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{item.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Expenses */}
          {expenseItems.length > 0 && (
            <CommandGroup heading={`Despesas (${expenseItems.length})`}>
              {expenseItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.subtitle}`}
                  onSelect={() => handleSelect(item)}
                >
                  <TableProperties className="mr-2 h-4 w-4 text-destructive/70" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate">{item.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{item.subtitle}</span>
                  </div>
                  {item.amount != null && (
                    <span className="ml-auto text-xs font-semibold tabular-nums text-destructive">
                      -{formatCurrency(item.amount)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Incomes */}
          {incomeItems.length > 0 && (
            <CommandGroup heading={`Receitas (${incomeItems.length})`}>
              {incomeItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.subtitle}`}
                  onSelect={() => handleSelect(item)}
                >
                  <TrendingUp className="mr-2 h-4 w-4 text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate">{item.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{item.subtitle}</span>
                  </div>
                  {item.amount != null && (
                    <span className="ml-auto text-xs font-semibold tabular-nums text-emerald-500">
                      +{formatCurrency(item.amount)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Accounts */}
          {accountItems.length > 0 && (
            <CommandGroup heading={`Contas (${accountItems.length})`}>
              {accountItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.title} ${item.subtitle}`}
                  onSelect={() => handleSelect(item)}
                >
                  <Wallet className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate">{item.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground capitalize">{item.subtitle}</span>
                  </div>
                  {item.amount != null && (
                    <span className="ml-auto text-xs font-semibold tabular-nums">
                      {formatCurrency(item.amount)}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
