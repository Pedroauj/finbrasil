import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Flame, Trophy, Medal, Star, Zap, Shield, Target, TrendingDown, Wallet, CalendarCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatCurrency, type Expense } from "@/types/expense";

/* ─── Achievement definitions ─── */
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  check: (ctx: GamificationCtx) => boolean;
}

interface GamificationCtx {
  expenses: Expense[];
  totalExpenses: number;
  budgetTotal: number;
  income: number;
  balance: number;
  streakDays: number;
  totalTransactions: number;
  categoriesUsed: number;
  daysWithExpenses: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_expense",
    title: "Primeiro Passo",
    description: "Registre sua primeira despesa",
    icon: Star,
    color: "#f59e0b",
    check: (ctx) => ctx.totalTransactions >= 1,
  },
  {
    id: "ten_expenses",
    title: "Organizado",
    description: "Registre 10 despesas",
    icon: CalendarCheck,
    color: "#3b82f6",
    check: (ctx) => ctx.totalTransactions >= 10,
  },
  {
    id: "fifty_expenses",
    title: "Mestre dos Registros",
    description: "Registre 50 despesas",
    icon: Trophy,
    color: "#a855f7",
    check: (ctx) => ctx.totalTransactions >= 50,
  },
  {
    id: "budget_set",
    title: "Planejador",
    description: "Defina um orçamento mensal",
    icon: Target,
    color: "#10b981",
    check: (ctx) => ctx.budgetTotal > 0,
  },
  {
    id: "under_budget",
    title: "Econômico",
    description: "Fique abaixo do orçamento no mês",
    icon: Shield,
    color: "#06b6d4",
    check: (ctx) => ctx.budgetTotal > 0 && ctx.totalExpenses <= ctx.budgetTotal,
  },
  {
    id: "savings_20",
    title: "Poupador Bronze",
    description: "Economize 20% da receita",
    icon: Wallet,
    color: "#cd7f32",
    check: (ctx) => ctx.income > 0 && ctx.balance >= ctx.income * 0.2,
  },
  {
    id: "savings_40",
    title: "Poupador Ouro",
    description: "Economize 40% da receita",
    icon: Wallet,
    color: "#fbbf24",
    check: (ctx) => ctx.income > 0 && ctx.balance >= ctx.income * 0.4,
  },
  {
    id: "five_categories",
    title: "Diversificado",
    description: "Use 5 categorias diferentes",
    icon: Medal,
    color: "#ec4899",
    check: (ctx) => ctx.categoriesUsed >= 5,
  },
  {
    id: "streak_7",
    title: "7 Dias no Controle",
    description: "Registre despesas por 7 dias seguidos",
    icon: Flame,
    color: "#ef4444",
    check: (ctx) => ctx.streakDays >= 7,
  },
  {
    id: "streak_30",
    title: "Imparável",
    description: "Registre despesas por 30 dias seguidos",
    icon: Zap,
    color: "#f97316",
    check: (ctx) => ctx.streakDays >= 30,
  },
  {
    id: "low_spending_day",
    title: "Dia de Economia",
    description: "Tenha um dia sem gastar nada",
    icon: TrendingDown,
    color: "#14b8a6",
    check: (ctx) => {
      const totalDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      return ctx.daysWithExpenses < totalDays && ctx.totalTransactions > 0;
    },
  },
];

/* ─── Streak calculation ─── */
function calculateStreak(expenses: Expense[]): number {
  if (expenses.length === 0) return 0;
  const dates = new Set(expenses.map(e => typeof e.date === "string" ? e.date.slice(0, 10) : ""));
  const sorted = Array.from(dates).sort().reverse();
  if (sorted.length === 0) return 0;

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const yesterdayDate = new Date(today);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

  if (!dates.has(todayStr) && !dates.has(yesterdayStr)) return 0;

  let streak = 0;
  const start = dates.has(todayStr) ? today : yesterdayDate;
  const d = new Date(start);
  while (true) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (dates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

function getDaysWithExpenses(expenses: Expense[]): number {
  const dates = new Set(expenses.map(e => typeof e.date === "string" ? e.date.slice(0, 10) : ""));
  dates.delete("");
  return dates.size;
}

/* ─── Component ─── */
interface GamificationProps {
  expenses: Expense[];
  totalExpenses: number;
  budgetTotal: number;
  income: number;
  balance: number;
  className?: string;
}

export function Gamification({ expenses, totalExpenses, budgetTotal, income, balance, className }: GamificationProps) {
  const ctx = useMemo<GamificationCtx>(() => {
    const cats = new Set(expenses.map(e => e.category));
    return {
      expenses,
      totalExpenses,
      budgetTotal,
      income,
      balance,
      streakDays: calculateStreak(expenses),
      totalTransactions: expenses.length,
      categoriesUsed: cats.size,
      daysWithExpenses: getDaysWithExpenses(expenses),
    };
  }, [expenses, totalExpenses, budgetTotal, income, balance]);

  const unlocked = useMemo(() => ACHIEVEMENTS.filter(a => a.check(ctx)), [ctx]);
  const locked = useMemo(() => ACHIEVEMENTS.filter(a => !a.check(ctx)), [ctx]);
  const progress = (unlocked.length / ACHIEVEMENTS.length) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Streak + Progress Header */}
      <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className={cn(
              "rounded-2xl p-3 ring-1",
              ctx.streakDays >= 7 ? "bg-orange-500/10 ring-orange-500/20" : "bg-muted/60 ring-border/40"
            )}>
              <Flame className={cn("h-6 w-6", ctx.streakDays >= 7 ? "text-orange-500" : "text-muted-foreground")} />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-3xl font-extrabold tabular-nums",
                  ctx.streakDays >= 7 ? "text-orange-500" : "text-foreground"
                )}>
                  {ctx.streakDays}
                </span>
                <span className="text-sm text-muted-foreground">
                  {ctx.streakDays === 1 ? "dia de streak" : "dias de streak"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ctx.streakDays === 0
                  ? "Registre uma despesa hoje para iniciar seu streak!"
                  : ctx.streakDays >= 30
                    ? "🔥 Imparável! Você é um mestre do controle financeiro!"
                    : ctx.streakDays >= 7
                      ? "🔥 Ótima sequência! Continue registrando seus gastos!"
                      : "Continue registrando diariamente para manter o streak!"}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Conquistas desbloqueadas</span>
              <span className="font-semibold text-foreground">{unlocked.length}/{ACHIEVEMENTS.length}</span>
            </div>
            <Progress value={progress} className="h-2 rounded-full" />
          </div>
        </CardContent>
      </Card>

      {/* Unlocked Achievements */}
      {unlocked.length > 0 && (
        <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Trophy className="h-4 w-4 text-primary" />
              Conquistas desbloqueadas
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {unlocked.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05, type: "spring", damping: 15 }}
                  className="rounded-2xl border border-border/40 bg-background/40 p-3 text-center"
                >
                  <div
                    className="mx-auto mb-2 h-10 w-10 rounded-xl grid place-items-center ring-1"
                    style={{ backgroundColor: `${a.color}15`, borderColor: `${a.color}30`, boxShadow: `0 0 20px ${a.color}10` }}
                  >
                    <a.icon className="h-5 w-5" style={{ color: a.color }} />
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate">{a.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{a.description}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locked Achievements */}
      {locked.length > 0 && (
        <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 backdrop-blur shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Medal className="h-4 w-4 text-muted-foreground" />
              Próximas conquistas
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="space-y-2">
              {locked.map(a => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/20 p-3 opacity-60"
                >
                  <div className="h-8 w-8 rounded-lg bg-muted/40 grid place-items-center shrink-0">
                    <a.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
