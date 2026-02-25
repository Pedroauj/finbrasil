import { startOfMonth, endOfMonth, format } from "date-fns";
import type { Expense } from "@/types/expense";

type Status = "paid" | "planned" | "overdue";

export function sumExpenses(
    expenses: Expense[],
    predicate?: (e: Expense) => boolean
) {
    return expenses
        .filter((e) => (predicate ? predicate(e) : true))
        .reduce((acc, e) => acc + Number(e.amount || 0), 0);
}

export function filterByMonth(expenses: Expense[], monthDate: Date) {
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    return expenses.filter((e) => {
        const d = new Date(e.date);
        return d >= start && d <= end;
    });
}

export function groupByCategory(expenses: Expense[]) {
    const map = new Map<string, number>();

    for (const e of expenses) {
        const key = e.category || "Sem categoria";
        map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
    }

    return Array.from(map.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);
}

export function groupByStatus(expenses: Expense[]) {
    const base: Record<Status, number> = { paid: 0, planned: 0, overdue: 0 };

    for (const e of expenses) {
        const s = (e.status || "paid") as Status;
        base[s] += Number(e.amount || 0);
    }

    return [
        { status: "Pago", key: "paid", total: base.paid },
        { status: "Planejado", key: "planned", total: base.planned },
        { status: "Atrasado", key: "overdue", total: base.overdue },
    ];
}

export function groupByMonth(expenses: Expense[], months: Date[]) {
    // Retorna array com { month: "Fev", total: 123 }
    return months.map((m) => {
        const inMonth = filterByMonth(expenses, m);
        const total = sumExpenses(inMonth);
        return { month: format(m, "MMM"), total };
    });
}