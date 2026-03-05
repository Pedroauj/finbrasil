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
  | "goals"
  | "settings";

const navItems: Array<{ key: NavKey; label: string; icon: any }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "expenses", label: "Gastos", icon: TableProperties },
  { key: "income", label: "Receitas", icon: TrendingUp },
  { key: "cards", label: "Cartões", icon: CreditCard },
  { key: "recurring", label: "Recorrentes", icon: RefreshCw },
  { key: "calendar", label: "Calendário", icon: Calendar },
  { key: "accounts", label: "Contas", icon: Wallet },
  { key: "reports", label: "Relatórios", icon: BarChart3 },
  { key: "goals", label: "Metas", icon: Target },
  { key: "settings", label: "Ajustes", icon: Settings2 },
];

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

  return (
    <div className="flex h-full flex-col overflow-visible">
      {/* Brand */}
      <div className={cn("p-4", isCollapsed && "px-3")}>
        <div
          className={cn(
            "relative",
            isCollapsed
              ? "flex flex-col items-center gap-2 px-2 py-3"
              : "rounded-2xl border border-border/50 bg-card/60 shadow-sm flex items-center gap-3 px-3 py-3"
          )}
        >
          {!isCollapsed && (
            <div className="h-9 w-9 rounded-xl shrink-0 flex items-center justify-center bg-primary/10">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z" className="fill-primary/20 stroke-primary" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M12 8V16M8 10L12 8L16 10M8 14L12 16L16 14" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="2" className="fill-primary"/>
              </svg>
            </div>
          )}

          {!isCollapsed ? (
            <div className="leading-tight">
              <div className="text-sm font-semibold whitespace-nowrap">FinBrasil</div>
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                Gestão Financeira
              </div>
            </div>
          ) : null}

          {showToggle ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                isCollapsed ? "mx-auto" : "ml-auto"
              )}
              title={isCollapsed ? "Expandir menu" : "Minimizar menu"}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </div>
      </div>

      {/* Nav */}
      <div className={cn("px-3", isCollapsed && "px-2")}>
        <div className="space-y-1 overflow-visible">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.key;
            const badgeCount = badges?.[item.key] ?? 0;

            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "relative group flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition",
                  "hover:bg-muted/50",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  "overflow-hidden",
                  "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300",
                  isCollapsed
                    ? "before:bg-[radial-gradient(160px_circle_at_50%_40%,hsl(var(--primary)/0.07),transparent_72%)]"
                    : "before:bg-[radial-gradient(200px_circle_at_25%_35%,hsl(var(--primary)/0.12),transparent_65%)]",
                  "hover:before:opacity-100",
                  isActive
                    ? cn(
                        "text-foreground bg-primary/8",
                        "ring-1 ring-primary/12",
                        "before:opacity-100",
                        isCollapsed
                          ? "before:bg-[radial-gradient(200px_circle_at_50%_40%,hsl(var(--primary)/0.06),transparent_75%)]"
                          : "before:bg-[radial-gradient(260px_circle_at_20%_30%,hsl(var(--primary)/0.10),transparent_68%)]",
                        "after:pointer-events-none after:absolute after:left-0 after:top-2.5 after:bottom-2.5 after:w-[2px] after:rounded-full",
                        "after:bg-primary/50"
                      )
                    : "text-muted-foreground",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition shrink-0",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />

                {!isCollapsed ? <span className="flex-1 text-left">{item.label}</span> : null}

                {badgeCount > 0 && (
                  <span
                    className={cn(
                      "flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none z-10",
                      isCollapsed
                        ? "absolute -top-1.5 -right-1.5 h-4 min-w-[16px] px-1 shadow-sm"
                        : "h-5 min-w-[20px] px-1.5"
                    )}
                  >
                    {badgeCount}
                  </span>
                )}

                {!isCollapsed ? (
                  <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(120px_circle_at_70%_30%,hsl(var(--primary)/0.08),transparent_60%)]" />
                ) : null}
              </button>
            );
          })}
        </div>

        {onNewExpense ? (
          <div className={cn("mt-4", isCollapsed ? "flex justify-center" : "px-1")}>
            <Button
              onClick={onNewExpense}
              className={cn(
                "group relative h-11 rounded-2xl font-semibold shadow-sm overflow-hidden transition-all",
                "bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground",
                "hover:brightness-[1.03] active:brightness-[0.98]",
                isCollapsed ? "w-11 p-0" : "w-full"
              )}
              title={isCollapsed ? "Novo gasto" : undefined}
            >
              {!isCollapsed ? (
                <>
                  <span className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/25 blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <span className="pointer-events-none absolute -left-16 top-0 h-full w-24 rotate-12 bg-white/10 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </>
              ) : null}

              <span className="relative flex items-center justify-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-black/10 ring-1 ring-white/15">
                  <Plus className="h-4 w-4 text-white" />
                </span>
                {!isCollapsed ? <span>Novo gasto</span> : null}
              </span>
            </Button>
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className={cn("mt-auto p-4", isCollapsed && "px-3")}>
        {footer ? (
          footer
        ) : (
          <div
            className={cn(
              "rounded-2xl border border-border/50 bg-card/40 px-4 py-3 text-xs text-muted-foreground",
              isCollapsed && "px-3 text-center"
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
  footer,
  children,
  onNewExpense,
  badges,

  /** Opcional: atalho vendável para planos (leva pra Ajustes → Planos & Cobrança) */
  planLabel,
  onPlanClick,
}: {
  active: NavKey;
  onNavigate: (k: NavKey) => void;
  title?: string;

  /**
   * Ações do topo para DESKTOP (md+).
   * Evita duplicação quando você tem ações específicas de mobile/desktop.
   */
  rightActions?: ReactNode;

  /**
   * Ações do topo para MOBILE (<md).
   * Se você tinha botões duplicados, mova o "Sair" mobile pra cá.
   */
  mobileActions?: ReactNode;

  footer?: ReactNode;
  children: ReactNode;
  onNewExpense?: () => void;
  badges?: Partial<Record<NavKey, number>>;

  /** Ex: "Plano: Ultra" / "Plano: Pro" */
  planLabel?: string;
  /** Clique do atalho de planos (normalmente: onNavigate("settings")) */
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_20%_10%,hsl(var(--primary)/0.08),transparent_60%),radial-gradient(900px_circle_at_80%_20%,hsl(var(--ring)/0.05),transparent_55%)]" />

      <div className="flex min-h-screen w-full">
        {/* Sidebar desktop */}
        <aside
          className={cn(
            "hidden bg-background/60 backdrop-blur xl:block",
            "shadow-[1px_0_0_hsl(var(--border)/0.25)]",
            "transition-[width] duration-300 ease-out",
            "will-change-[width]",
            "fixed top-0 left-0 h-screen shrink-0 overflow-y-auto z-30"
          )}
          style={{ width: collapsed ? 80 : 288 }}
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
        <div className="hidden xl:block shrink-0 transition-[width] duration-300 ease-out" style={{ width: collapsed ? 80 : 288 }} />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 bg-background/70 backdrop-blur shadow-[0_1px_0_hsl(var(--border)/0.25)]">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className="xl:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
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
                <div className="text-sm font-semibold truncate">{title}</div>
              </div>

              {/* Plan shortcut (optional) */}
              {planLabel ? (
                <Button
                  type="button"
                  variant="outline"
                  className="hidden sm:flex h-10 rounded-xl gap-2"
                  onClick={onPlanClick ?? (() => onNavigate("settings"))}
                  title="Gerenciar planos"
                >
                  <Crown className="h-4 w-4" />
                  <span className="text-sm">{planLabel}</span>
                </Button>
              ) : null}

              {/* Actions: split mobile vs desktop to prevent duplication */}
              <div className="flex items-center gap-2">
                {/* Mobile actions only (<md) */}
                {mobileActions ? (
                  <div className="flex items-center gap-2 md:hidden">{mobileActions}</div>
                ) : null}

                {/* Desktop actions only (md+) */}
                {rightActions ? (
                  <div className="hidden md:flex items-center gap-2">{rightActions}</div>
                ) : null}
              </div>
            </div>
          </header>

          <main className="relative flex-1 min-w-0 px-3 sm:px-5 py-4 sm:py-5">
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-[32px]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 10%, hsl(var(--primary) / 0.08), transparent 55%)",
              }}
            />
            <div className="w-full min-w-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

// Ajuda caso alguma parte do projeto importe como default
export default AppShell;