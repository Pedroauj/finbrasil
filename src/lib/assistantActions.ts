import type { ParsedExpense } from "@/lib/expenseParser";

export type AssistantAction =
    | { type: "add_expense"; data: ParsedExpense }
    | { type: "none"; message: string };

export function buildAddExpenseAction(parsed: ParsedExpense): AssistantAction {
    if (parsed.missing?.length) {
        return {
            type: "none",
            message: `Faltou info: ${parsed.missing.join(", ")}.`,
        };
    }
    return { type: "add_expense", data: parsed };
}