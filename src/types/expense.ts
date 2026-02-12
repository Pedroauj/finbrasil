export interface Expense {
  id: string;
  date: string; // ISO date string
  description: string;
  category: string;
  amount: number;
  isRecurring?: boolean; // marks if this was generated from a recurring expense
}

export interface RecurringExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  dayOfMonth: number;
  active: boolean;
}

export interface Budget {
  total: number;
  byCategory: Record<string, number>;
}

export interface MonthData {
  expenses: Expense[];
  budget: Budget;
}

export const DEFAULT_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Lazer",
  "Educação",
  "Outros",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação": "hsl(15, 80%, 55%)",
  "Transporte": "hsl(210, 70%, 50%)",
  "Moradia": "hsl(250, 65%, 55%)",
  "Saúde": "hsl(152, 60%, 42%)",
  "Lazer": "hsl(38, 92%, 50%)",
  "Educação": "hsl(330, 65%, 55%)",
  "Outros": "hsl(220, 10%, 55%)",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || `hsl(${Math.abs(hashCode(category)) % 360}, 60%, 50%)`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
