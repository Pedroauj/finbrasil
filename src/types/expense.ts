export type TransactionStatus = 'planned' | 'paid' | 'overdue';
export type AccountType = 'checking' | 'savings' | 'wallet' | 'credit_card' | 'investment';

export interface FinancialAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  icon: string;
  isActive: boolean;
  appliedValue?: number;
  currentValue?: number;
}

export type AdjustmentReason = 'manual' | 'yield' | 'fee' | 'correction' | 'other';

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  manual: 'Atualização manual',
  yield: 'Rendimento',
  fee: 'Taxa',
  correction: 'Correção',
  other: 'Outro',
};

export interface AccountAdjustment {
  id: string;
  accountId: string;
  amount: number;
  reason: AdjustmentReason;
  description?: string;
  date: string;
}

export interface AccountTransfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  date: string;
}

export interface Expense {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  isRecurring?: boolean;
  cardId?: string;
  status: TransactionStatus;
  accountId?: string;
}

export interface RecurringExpense {
  id: string;
  description: string;
  category: string;
  amount: number;
  dayOfMonth: number;
  active: boolean;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  color: string;
}

export interface InvoiceItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

export interface CreditCardInvoice {
  id: string;
  cardId: string;
  month: string; // YYYY-MM
  items: InvoiceItem[];
  isPaid: boolean;
}

export interface Budget {
  total: number;
  byCategory: Record<string, number>;
}

export interface Salary {
  id: string;
  amount: number;
  month: number;
  year: number;
  dayOfReceipt: number;
  autoRepeat: boolean;
}

export interface ExtraIncome {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
}

export const INCOME_CATEGORIES = [
  "Freelance",
  "Venda",
  "Reembolso",
  "Bônus",
  "Investimento",
  "Outros",
] as const;

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
  "Alimentação": "hsl(15, 85%, 50%)",
  "Transporte": "hsl(210, 80%, 45%)",
  "Moradia": "hsl(250, 80%, 55%)",
  "Saúde": "hsl(152, 75%, 35%)",
  "Lazer": "hsl(38, 95%, 45%)",
  "Educação": "hsl(330, 80%, 50%)",
  "Outros": "hsl(220, 15%, 45%)",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || `hsl(${Math.abs(hashCode(category)) % 360}, 65%, 45%)`;
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
