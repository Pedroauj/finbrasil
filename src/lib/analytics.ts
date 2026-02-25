import { eachDayOfInterval, endOfMonth, endOfWeek, format, isValid, startOfMonth } from "date-fns";
import type { Expense, TransactionStatus } from "@/types/expense";

export type Status = TransactionStatus; // "paid" | "planned" | "overdue"

export function toDateSafe(dateLike: string | Date): Date | null {
    const d = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
    return isValid(d) ? d : null;
}

export function sumExpenses(expenses: Expense[], predicate?: (e: Expense) => boolean): number {
    return expenses
        .filter((e) => (predicate ? predicate(e) : true))
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);
}

export function filterByMonth(expenses: Expense[], monthDate: Date): Expense[] {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    return expenses.filter((e) => {
        const d = toDateSafe(e.date);
        return !!d && d >= start && d <= end;
    });
}

export type CategoryPoint = { name: string; value: number };

export function groupByCategory(expenses: Expense[]): CategoryPoint[] {
    const map = new Map<string, number>();

    for (const e of expenses) {
        const key = e.category || "Sem categoria";
        map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    }

    return Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
}

export type StatusPoint = { label: string; key: Status; total: number; percent: number };

export function groupByStatus(expenses: Expense[]): StatusPoint[] {
    const base: Record<Status, number> = { paid: 0, planned: 0, overdue: 0 };

    for (const e of expenses) {
        const s = (e.status || "paid") as Status;
        base[s] += Number(e.amount || 0);
    }

    const arr: Array<{ label: string; key: Status; total: number }> = [
        { label: "Pago", key: "paid", total: base.paid },
        { label: "Planejado", key: "planned", total: base.planned },
        { label: "Atrasado", key: "overdue", total: base.overdue },
    ];

    const totalAll = arr.reduce((acc, x) => acc + x.total, 0) || 0;

    return arr.map((x) => ({
        ...x,
        percent: totalAll > 0 ? (x.total / totalAll) * 100 : 0,
    }));
}

export type WeekPoint = { name: string; total: number };

export function weeklyTotalsForMonth(expenses: Expense[], monthDate: Date): WeekPoint[] {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    // semana começando na segunda (1)
    const weeks: Date[] = [];
    let cursor = start;
    while (cursor <= end) {
        weeks.push(cursor);
        const next = new Date(cursor);
        next.setDate(next.getDate() + 7);
        cursor = next;
    }

    return weeks.map((weekStart, i) => {
        const wEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const total = expenses
            .filter((e) => {
                const d = toDateSafe(e.date);
                return !!d && d >= weekStart && d <= wEnd;
            })
            .reduce((s, e) => s + Number(e.amount || 0), 0);

        return { name: `Sem ${i + 1}`, total };
    });
}

export type DailyCumulativePoint = { day: string; total: number };

/**
 * Soma acumulada de gastos no mês (dia a dia)
 * Observação: usa TODOS os gastos do mês; se quiser só "paid", passe predicate.
 */
export function cumulativeExpensesDaily(params: {
    expenses: Expense[];
    baseDate: Date;
    predicate?: (e: Expense) => boolean;
}): DailyCumulativePoint[] {
    const { expenses, baseDate, predicate } = params;

    const start = startOfMonth(baseDate);
    const end = endOfMonth(baseDate);
    const days = eachDayOfInterval({ start, end });

    const expenseByDay = new Map<string, number>();

    for (const e of expenses) {
        if (predicate && !predicate(e)) continue;

        const d = toDateSafe(e.date);
        if (!d || d < start || d > end) continue;

        const key = format(d, "yyyy-MM-dd");
        expenseByDay.set(key, (expenseByDay.get(key) || 0) + Number(e.amount || 0));
    }

    let acc = 0;

    return days.map((d) => {
        const key = format(d, "yyyy-MM-dd");
        acc += expenseByDay.get(key) || 0;
        return { day: format(d, "dd"), total: acc };
    });
}

export type MonthlyPoint = { month: string; total: number };

export function groupByMonth(expenses: Expense[], months: Date[]): MonthlyPoint[] {
    return months.map((m) => {
        const inMonth = filterByMonth(expenses, m);
        const total = sumExpenses(inMonth);
        return { month: format(m, "MMM"), total };
    });
}

/** ✅ NOVO: Top N gastos (por amount) */
export type TopExpensePoint = { name: string; total: number };

function normalizeLabel(s: string, max = 26) {
    const text = (s || "").trim() || "Sem descrição";
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}…`;
}

export function topExpenses(expenses: Expense[], limit = 10): TopExpensePoint[] {
    return [...expenses]
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))
        .slice(0, Math.max(1, limit))
        .map((e) => ({
            name: normalizeLabel(e.description),
            total: Number(e.amount || 0),
        }))
        // Recharts (layout vertical) fica mais legível com o menor em cima, maior embaixo
        .reverse();
}