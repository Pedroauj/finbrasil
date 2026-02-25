// src/components/AppShell.tsx
import { ReactNode } from "react";
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavKey =
    | "dashboard"
    | "expenses"
    | "cards"
    | "recurring"
    | "calendar"
    | "accounts"
    | "settings";

const navItems: Array<{ key: NavKey; label: string; icon: any }> = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "expenses", label: "Gastos", icon: TableProperties },
    { key: "cards", label: "Cartões", icon: CreditCard },
    { key: "recurring", label: "Recorrentes", icon: RefreshCw },
    { key: "calendar", label: "Calendário", icon: Calendar },
    { key: "accounts", label: "Contas", icon: Wallet },
    { key: "settings", label: "Ajustes", icon: Settings2 },
];

function SidebarNav({
    active,
    onNavigate,
    footer,
    onAddExpense,
    addExpenseLabel = "Novo gasto",
}: {
    active: NavKey;
    onNavigate: (k: NavKey) => void;
    footer?: ReactNode;
    onAddExpense?: () => void;
    addExpenseLabel?: string;
}) {
    return (
        <div className="flex h-full flex-col">
            <div className="p-4">
                <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-3 py-3 shadow-sm">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 ring-1 ring-primary/15" />
                    <div className="leading-tight">
                        <div className="text-sm font-semibold">FinBrasil</div>
                        <div className="text-xs text-muted-foreground">Gestão Financeira</div>
                    </div>
                </div>
            </div>

            <div className="px-3">
                <div className="space-y-2">
                    {/* Primary action (opcional) */}
                    {onAddExpense && (
                        <Button
                            onClick={onAddExpense}
                            className="h-11 w-full justify-between rounded-2xl px-4 font-semibold shadow-sm"
                        >
                            <span>{addExpenseLabel}</span>
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                                <Plus className="h-4 w-4 text-primary-foreground" />
                            </span>
                        </Button>
                    )}

                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = active === item.key;

                            return (
                                <button
                                    key={item.key}
                                    onClick={() => onNavigate(item.key)}
                                    className={cn(
                                        "group flex w-full items-center gap-2 rounded-2xl px-3 h-11 text-sm transition",
                                        "hover:bg-muted/50",
                                        isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground"
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "h-4 w-4 transition",
                                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                        )}
                                    />
                                    <span className="flex-1 text-left">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mt-auto p-4">{footer}</div>
        </div>
    );
}

export function AppShell({
    active,
    onNavigate,
    title,
    rightActions,
    footer,
    children,
    onAddExpense,
    addExpenseLabel,
}: {
    active: NavKey;
    onNavigate: (k: NavKey) => void;
    title?: string;
    rightActions?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;

    /** opcional */
    onAddExpense?: () => void;
    addExpenseLabel?: string;
}) {
    return (
        <div className="min-h-screen bg-background">
            <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(1200px_circle_at_20%_10%,hsl(var(--primary)/0.08),transparent_60%),radial-gradient(900px_circle_at_80%_20%,hsl(var(--ring)/0.05),transparent_55%)]" />

            <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
                <aside className="hidden w-72 bg-background/60 backdrop-blur xl:block shadow-[1px_0_0_hsl(var(--border)/0.25)]">
                    <SidebarNav
                        active={active}
                        onNavigate={onNavigate}
                        footer={footer}
                        onAddExpense={onAddExpense}
                        addExpenseLabel={addExpenseLabel}
                    />
                </aside>

                <div className="flex flex-1 flex-col">
                    <header className="sticky top-0 z-20 bg-background/70 backdrop-blur shadow-[0_1px_0_hsl(var(--border)/0.25)]">
                        <div className="flex items-center gap-3 px-4 py-2.5">
                            <div className="xl:hidden">
                                <Sheet>
                                    <SheetTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-11 w-11 rounded-2xl">
                                            <Menu className="h-4 w-4" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="w-80 p-0">
                                        <SidebarNav
                                            active={active}
                                            onNavigate={onNavigate}
                                            footer={footer}
                                            onAddExpense={onAddExpense}
                                            addExpenseLabel={addExpenseLabel}
                                        />
                                    </SheetContent>
                                </Sheet>
                            </div>

                            <div className="flex-1">
                                <div className="text-sm font-semibold">{title}</div>
                                <div className="text-xs text-muted-foreground">Visão geral e controle</div>
                            </div>

                            <div className="flex items-center gap-2">{rightActions}</div>
                        </div>
                    </header>

                    <main className="flex-1 px-4 py-5 sm:px-5">
                        <div className="mx-auto w-full max-w-[1320px]">{children}</div>
                    </main>
                </div>
            </div>
        </div>
    );
}