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
    TrendingUp,
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
    | "settings";

const navItems: Array<{ key: NavKey; label: string; icon: any }> = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "expenses", label: "Gastos", icon: TableProperties },
    { key: "income", label: "Receitas", icon: TrendingUp },
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
    onNewExpense,
}: {
    active: NavKey;
    onNavigate: (k: NavKey) => void;
    footer?: ReactNode;
    onNewExpense?: () => void;
}) {
    return (
        <div className="flex h-full flex-col">
            {/* Brand */}
            <div className="p-4">
                <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-3 py-3 shadow-sm">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 ring-1 ring-primary/15" />
                    <div className="leading-tight">
                        <div className="text-sm font-semibold">FinBrasil</div>
                        <div className="text-xs text-muted-foreground">Gestão Financeira</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <div className="px-3">
                <div className="space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = active === item.key;

                        return (
                            <button
                                key={item.key}
                                onClick={() => onNavigate(item.key)}
                                className={cn(
                                    "relative group flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition",
                                    "hover:bg-muted/50",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                    "overflow-hidden",

                                    // aura sutil no hover
                                    "before:pointer-events-none before:absolute before:inset-0 before:opacity-0 before:transition-opacity before:duration-300",
                                    "before:bg-[radial-gradient(200px_circle_at_25%_35%,hsl(var(--primary)/0.12),transparent_65%)]",
                                    "hover:before:opacity-100",

                                    isActive
                                        ? cn(
                                            "text-foreground bg-primary/10",
                                            "shadow-[inset_0_1px_0_hsl(var(--foreground)/0.06)]",
                                            "ring-1 ring-primary/18",

                                            // glow ativo
                                            "before:opacity-100",
                                            "before:bg-[radial-gradient(260px_circle_at_20%_30%,hsl(var(--primary)/0.18),transparent_68%)]",

                                            // LED strip lateral
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
                                <span className="flex-1 text-left">{item.label}</span>

                                {/* specular bem leve */}
                                <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100 bg-[radial-gradient(120px_circle_at_70%_30%,hsl(var(--primary)/0.08),transparent_60%)]" />
                            </button>
                        );
                    })}
                </div>

                {/* Botão Novo gasto (opcional) */}
                {onNewExpense ? (
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
                            <span className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/25 blur-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                            <span className="pointer-events-none absolute -left-16 top-0 h-full w-24 rotate-12 bg-white/10 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                            <span className="relative flex items-center justify-center gap-2">
                                <span className="grid h-8 w-8 place-items-center rounded-xl bg-black/10 ring-1 ring-white/15">
                                    <Plus className="h-4 w-4 text-white" />
                                </span>
                                <span>Novo gasto</span>
                            </span>
                        </Button>
                    </div>
                ) : null}
            </div>

            {/* Footer */}
            <div className="mt-auto p-4">
                {footer ? (
                    footer
                ) : (
                    <div className="rounded-2xl border border-border/50 bg-card/40 px-4 py-3 text-xs text-muted-foreground">
                        Controle total do seu dinheiro
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
    footer,
    children,
    onNewExpense,
}: {
    active: NavKey;
    onNavigate: (k: NavKey) => void;
    title?: string;
    rightActions?: ReactNode;
    footer?: ReactNode;
    children: ReactNode;
    onNewExpense?: () => void;
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
                        onNewExpense={onNewExpense}
                    />
                </aside>

                <div className="flex flex-1 flex-col">
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

                    <main className="relative flex-1 px-4 sm:px-5 py-5">
                        <div
                            className="pointer-events-none absolute inset-0 -z-10 rounded-[32px]"
                            style={{
                                backgroundImage:
                                    "radial-gradient(circle at 30% 10%, hsl(var(--primary) / 0.08), transparent 55%)",
                            }}
                        />
                        <div className="mx-auto w-full max-w-[1320px]">{children}</div>
                    </main>
                </div>
            </div>
        </div>
    );
}