// src/components/AppShell.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  Menu,
  LayoutDashboard,
  TableProperties,
  CreditCard,
  RefreshCw,
  Calendar,
  Wallet,
  Settings2,
  Plus,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Crown,
  BarChart3,
  Target,
  PiggyBank,
  Users,
  Layers,
  Activity,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type NavKey =
  | "dashboard"
  | "expenses"
  | "income"
  | "cards"
  | "recurring"
  | "calendar"
  | "accounts"
  | "reports"
  | "comparative"
  | "installments"
  | "goals"
  | "networth"
  | "family"
  | "settings";

const navItems: Array<{ key: NavKey; label: string; icon: any; group?: string }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, group: "principal" },
  { key: "expenses", label: "Gastos", icon: TableProperties, group: "principal" },
  { key: "income", label: "Receitas", icon: TrendingUp, group: "principal" },
  { key: "cards", label: "Cartões", icon: CreditCard, group: "gestão" },
  { key: "recurring", label: "Recorrentes", icon: RefreshCw, group: "gestão" },
  { key: "installments", label: "Parcelas", icon: Layers, group: "gestão" },
  { key: "calendar", label: "Calendário", icon: Calendar, group: "gestão" },
  { key: "accounts", label: "Contas", icon: Wallet, group: "análise" },
  { key: "networth", label: "Patrimônio", icon: PiggyBank, group: "análise" },
  { key: "reports", label: "Relatórios", icon: BarChart3, group: "análise" },
  { key: "comparative", label: "Comparativo", icon: Activity, group: "análise" },
  { key: "goals", label: "Metas", icon: Target, group: "análise" },
  { key: "family", label: "Família", icon: Users, group: "outros" },
  { key: "settings", label: "Ajustes", icon: Settings2, group: "outros" },
];

const GROUP_LABELS: Record<string, string> = {
  principal: "Principal",
  gestão: "Gestão",
  análise: "Análise",
  outros: "Outros",
};

const SIDEBAR_STORAGE_KEY = "finbrasil.sidebar.collapsed";

function SidebarNav({
  active,
  onNavigate,
  footer,
  onNewExpense,
  collapsed,
  onToggleCollapsed,
  showToggle,
  badges,
}: {
  active: NavKey;
  onNavigate: (k: NavKey) => void;
  footer?: ReactNode;
  onNewExpense?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  showToggle?: boolean;
  badges?: Partial<Record<NavKey, number>>;
}) {
  const isCollapsed = !!collapsed;

  // Group nav items
  const groups = navItems.reduce<Record<string, typeof navItems>>((acc, item) => {
    const g = item.group ?? "outros";
    if (!acc[g]) acc[g] = [];
    acc[g].push(item);
    return acc;
  }, {});

  return (
    <div className="flex h-full flex-col overflow-visible">
      {/* Brand */}
      <div className={cn("p-4", isCollapsed && "px-3")}>
        <div
          className={cn(
            "relative",
            isCollapsed
              ? "flex flex-col items-center gap-2 px-2 py-3"
              : "rounded-2xl border border-border/40 bg-card/50 backdrop-blur-lg shadow-sm flex items-center gap-3 px-3 py-3"
          )}
        >
          {!isCollapsed && (
            <div className="h-9 w-9 rounded-xl shrink-0 flex items-center justify-center bg-primary/10 ring-1 ring-primary/15">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" className="fill-primary/20 stroke-primary" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M12 8V16M8 10L12 8L16 10M8 14L12 16L16 14" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="2" className="fill-primary"/>
              </svg>
            </div>
          )}

          {!isCollapsed ? (
            <div className="leading-tight">
              <div className="text-sm font-bold whitespace-nowrap tracking-tight">FinBrasil</div>
              <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                Gestão Financeira
              </div>
            </div>
          ) : null}

          {showToggle ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className={cn(
                "h-7 w-7 rounded-lg flex items-center justify-center transition-all duration-200",
                "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                isCollapsed ? "mx-auto" : "ml-auto"
              )}
              title={isCollapsed ? "Expandir menu" : "Minimizar menu"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Nav grouped */}
      <div className={cn("px-3 flex-1 overflow-y-auto", isCollapsed && "px-2")}>
        {Object.entries(groups).map(([groupKey, items]) => (
          <div key={groupKey} className="mb-1">
            {!isCollapsed && (
              <div className="px-3 pt-4 pb-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {GROUP_LABELS[groupKey] ?? groupKey}
                </span>
              </div>
            )}
            {isCollapsed && groupKey !== "principal" && (
              <div className="mx-auto my-2 h-px w-6 bg-border/40" />
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.key;
                const badgeCount = badges?.[item.key] ?? 0;

                return (
                  <button
                    key={item.key}
                    data-onboarding={item.key}
                    onClick={() => onNavigate(item.key)}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "relative group flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200",
                      "hover:bg-muted/40",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      "overflow-hidden",
                      isActive
                        ? cn(
                            "text-foreground bg-primary/[0.06]",
                            "shadow-sm border border-primary/10",
                            "after:pointer-events-none after:absolute after:left-0 after:top-1.5 after:bottom-1.5 after:w-[2.5px] after:rounded-full",
                            "after:bg-primary/60"
                          )
                        : "text-muted-foreground border border-transparent",
                      isCollapsed && "justify-center px-2"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] transition-colors shrink-0",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground/70 group-hover:text-foreground"
                      )}
                    />

                    {!isCollapsed ? <span className="flex-1 text-left">{item.label}</span> : null}

                    {badgeCount > 0 && (
                      <span
                        className={cn(
                          "flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none z-10",
                          isCollapsed
                            ? "absolute -top-1 -right-1 h-4 min-w-[16px] px-1 shadow-sm"
                            : "h-5 min-w-[20px] px-1.5"
                        )}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {onNewExpense ? (
          <div className={cn("mt-5 mb-2", isCollapsed ? "flex justify-center" : "px-0")}>
            <Button
              onClick={onNewExpense}
              className={cn(
                "group relative h-10 rounded-xl font-semibold overflow-hidden transition-all duration-300",
                "bg-primary text-primary-foreground",
                "shadow-sm hover:shadow-md hover:shadow-primary/20",
                isCollapsed ? "w-10 p-0" : "w-full"
              )}
              title={isCollapsed ? "Novo gasto" : undefined}
            >
              <span className="relative flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                {!isCollapsed ? <span>Novo gasto</span> : null}
              </span>
            </Button>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className={cn("p-4", isCollapsed && "px-3")}>
        {footer ? (
          footer
        ) : (
          <div
            className={cn(
              "rounded-xl border border-border/30 bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground/60",
              isCollapsed && "px-2 text-center"
            )}
            title={isCollapsed ? "Controle total do seu dinheiro" : undefined}
          >
            {isCollapsed ? "•" : "Controle total do seu dinheiro"}
          </div>
        )}
      </div>
    </div>
  );
}

export function AppShell({
  active,
  onNavigate,
  title,
  rightActions,
  mobileActions,
  mobileMonthNavigator,
  footer,
  children,
  onNewExpense,
  badges,
  planLabel,
  onPlanClick,
}: {
  active: NavKey;
  onNavigate: (k: NavKey) => void;
  title?: string;
  rightActions?: ReactNode;
  mobileActions?: ReactNode;
  mobileMonthNavigator?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onNewExpense?: () => void;
  badges?: Partial<Record<NavKey, number>>;
  planLabel?: string;
  onPlanClick?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (raw === "1") setCollapsed(true);
      if (raw === "0") setCollapsed(false);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-background overflow-x-clip">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1000px_circle_at_15%_10%,hsl(var(--primary)/0.06),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_85%_90%,hsl(var(--primary)/0.03),transparent_55%)]" />
      </div>

      <div className="flex min-h-[100dvh] w-full">
        {/* Sidebar desktop */}
        <aside
          className={cn(
            "hidden xl:block",
            "bg-background/90 backdrop-blur-sm",
            "border-r border-border/30",
            "transition-[width] duration-300 ease-out",
            "will-change-[width]",
            "fixed top-0 left-0 h-screen shrink-0 overflow-y-auto z-30"
          )}
          style={{ width: collapsed ? 80 : 272 }}
        >
          <SidebarNav
            active={active}
            onNavigate={onNavigate}
            footer={footer}
            onNewExpense={onNewExpense}
            collapsed={collapsed}
            onToggleCollapsed={() => setCollapsed((v) => !v)}
            showToggle
            badges={badges}
          />
        </aside>

        {/* Spacer for fixed sidebar */}
        <div className="hidden xl:block shrink-0 transition-[width] duration-300 ease-out" style={{ width: collapsed ? 80 : 272 }} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-border/30 bg-background/90 backdrop-blur-sm">
            {/* Row 1: hamburger + title + compact actions */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5">
              <div className="xl:hidden shrink-0">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl">
                      <Menu className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>

                  <SheetContent side="left" className="w-80 p-0">
                    <SidebarNav
                      active={active}
                      onNavigate={onNavigate}
                      footer={footer}
                      onNewExpense={onNewExpense}
                      collapsed={false}
                      showToggle={false}
                      badges={badges}
                    />
                  </SheetContent>
                </Sheet>
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate tracking-tight">{title}</div>
              </div>

              {/* Plan shortcut */}
              {planLabel ? (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden sm:flex h-9 rounded-xl gap-2 text-xs"
                  onClick={onPlanClick ?? (() => onNavigate("settings"))}
                  title="Gerenciar planos"
                >
                  <Crown className="h-3.5 w-3.5 text-primary" />
                  <span>{planLabel}</span>
                </Button>
              ) : null}

              {/* Actions — desktop */}
              {rightActions ? (
                <div className="hidden md:flex items-center gap-1.5 shrink-0">{rightActions}</div>
              ) : null}

              {/* Actions — mobile (compact, no month nav) */}
              {mobileActions ? (
                <div className="flex items-center gap-1 md:hidden shrink-0">{mobileActions}</div>
              ) : null}
            </div>

            {/* Row 2 mobile: month navigator — always visible on mobile */}
            {mobileMonthNavigator ? (
              <div className="flex md:hidden items-center justify-center border-t border-border/20 px-3 py-1.5">
                {mobileMonthNavigator}
              </div>
            ) : null}
          </header>

          <main className="relative flex-1 min-w-0 px-3 sm:px-5 py-4 sm:py-5 overflow-y-auto">
            <div className="w-full min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppShell;
