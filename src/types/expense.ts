import {
  eachDayOfInterval,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  startOfMonth,
  startOfYear,
} from "date-fns";

/** =========================
 *  Types principais do app
 *  ========================= */

export type TransactionStatus = "planned" | "paid" | "overdue";
export type AccountType = "checking" | "savings" | "wallet" | "credit_card" | "investment";

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

export type AdjustmentReason = "manual" | "yield" | "fee" | "correction" | "other";

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  manual: "Atualização manual",
  yield: "Rendimento",
  fee: "Taxa",
  correction: "Correção",
  other: "Outro",
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
  date: string; // YYYY-MM-DD
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

  // Parcelas (installments)
  installmentGroupId?: string; // UUID compartilhado por todas parcelas da compra
  installmentCurrent?: number; // ex: 2
  installmentTotal?: number; // ex: 6
  totalPurchaseAmount?: number; // valor total da compra
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
  month: number; // 1..12
  year: number;
  dayOfReceipt: number; // 1..31
  autoRepeat: boolean;
}

export interface ExtraIncome {
  id: string;
  amount: number;
  description: string;
  category: string;
  date: string; // YYYY-MM-DD
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

/** =========================
 *  Categorias e helpers
 *  ========================= */

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
  Alimentação: "hsl(15, 85%, 50%)",
  Transporte: "hsl(210, 80%, 45%)",
  Moradia: "hsl(250, 80%, 55%)",
  Saúde: "hsl(152, 75%, 35%)",
  Lazer: "hsl(38, 95%, 45%)",
  Educação: "hsl(330, 80%, 50%)",
  Outros: "hsl(220, 15%, 45%)",
};

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || `hsl(${Math.abs(hashCode(category)) % 360}, 65%, 45%)`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Chave de mês no padrão YYYY-MM (usado no store / faturas / agregações)
 */
export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** =========================
 *  Utils de data e parsing
 *  ========================= */

export function toDateSafe(dateLike: string | Date): Date | null {
  const d = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return isValid(d) ? d : null;
}

export function isInInterval(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

export function monthInterval(base: Date) {
  return { start: startOfMonth(base), end: endOfMonth(base) };
}

export function yearInterval(base: Date) {
  return { start: startOfYear(base), end: endOfYear(base) };
}

/** =========================
 *  Filtros principais
 *  ========================= */

export function filterExpensesByMonth(expenses: Expense[], base: Date): Expense[] {
  const { start, end } = monthInterval(base);
  return expenses.filter((e) => {
    const d = toDateSafe(e.date);
    return !!d && isInInterval(d, start, end);
  });
}

export function filterExpensesByYear(expenses: Expense[], base: Date): Expense[] {
  const { start, end } = yearInterval(base);
  return expenses.filter((e) => {
    const d = toDateSafe(e.date);
    return !!d && isInInterval(d, start, end);
  });
}

export function filterIncomesByMonth(extraIncomes: ExtraIncome[], base: Date): ExtraIncome[] {
  const { start, end } = monthInterval(base);
  return extraIncomes.filter((i) => {
    const d = toDateSafe(i.date);
    return !!d && isInInterval(d, start, end);
  });
}

export function filterIncomesByYear(extraIncomes: ExtraIncome[], base: Date): ExtraIncome[] {
  const { start, end } = yearInterval(base);
  return extraIncomes.filter((i) => {
    const d = toDateSafe(i.date);
    return !!d && isInInterval(d, start, end);
  });
}

/** =========================
 *  Somatórios
 *  ========================= */

export function sumAmounts<T extends { amount: number }>(
  items: T[],
  predicate?: (item: T) => boolean
): number {
  return items
    .filter((x) => (predicate ? predicate(x) : true))
    .reduce((acc, x) => acc + Number(x.amount || 0), 0);
}

export function sumExpenses(expenses: Expense[], opts?: { status?: TransactionStatus }) {
  if (!opts?.status) return sumAmounts(expenses);
  return sumAmounts(expenses, (e) => e.status === opts.status);
}

export function sumExtraIncomes(extraIncomes: ExtraIncome[]) {
  return sumAmounts(extraIncomes);
}

/**
 * Salário no seu modelo é mensal (month/year).
 * Aqui pega o salário do mês base, se existir.
 */
export function getSalaryForMonth(salaries: Salary[] | undefined, base: Date): number {
  if (!salaries?.length) return 0;
  const month = base.getMonth() + 1; // Salary.month é 1..12
  const year = base.getFullYear();
  const found = salaries.find((s) => s.month === month && s.year === year);
  return found ? Number(found.amount || 0) : 0;
}

/** =========================
 *  Agrupamentos para gráficos
 *  ========================= */

export type CategoryAgg = { category: string; total: number; percent?: number };

export function groupExpensesByCategory(expenses: Expense[]): CategoryAgg[] {
  const map = new Map<string, number>();

  for (const e of expenses) {
    const key = e.category || "Sem categoria";
    map.set(key, (map.get(key) || 0) + Number(e.amount || 0));
  }

  const arr = Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const totalAll = arr.reduce((acc, x) => acc + x.total, 0) || 0;

  return arr.map((x) => ({
    ...x,
    percent: totalAll > 0 ? (x.total / totalAll) * 100 : 0,
  }));
}

export type StatusAgg = { label: string; status: TransactionStatus; total: number; percent?: number };

export function groupExpensesByStatus(expenses: Expense[]): StatusAgg[] {
  const base: Record<TransactionStatus, number> = {
    paid: 0,
    planned: 0,
    overdue: 0,
  };

  for (const e of expenses) {
    base[e.status] += Number(e.amount || 0);
  }

  const arr: StatusAgg[] = [
    { label: "Pago", status: "paid", total: base.paid },
    { label: "Planejado", status: "planned", total: base.planned },
    { label: "Atrasado", status: "overdue", total: base.overdue },
  ];

  const totalAll = arr.reduce((acc, x) => acc + x.total, 0) || 0;

  return arr.map((x) => ({
    ...x,
    percent: totalAll > 0 ? (x.total / totalAll) * 100 : 0,
  }));
}

/** =========================
 *  Séries temporais (linhas/barras/sparklines)
 *  ========================= */

export type MonthlyPoint = { month: string; value: number };

export function expensesSeriesByMonth(expenses: Expense[], months: Date[]): MonthlyPoint[] {
  return months.map((m) => {
    const inMonth = filterExpensesByMonth(expenses, m);
    return { month: format(m, "MMM"), value: sumExpenses(inMonth) };
  });
}

export function incomesSeriesByMonth(
  extraIncomes: ExtraIncome[],
  salaries: Salary[] | undefined,
  months: Date[]
): MonthlyPoint[] {
  return months.map((m) => {
    const inMonth = filterIncomesByMonth(extraIncomes, m);
    const salaryValue = getSalaryForMonth(salaries, m);
    return { month: format(m, "MMM"), value: salaryValue + sumExtraIncomes(inMonth) };
  });
}

export type DailyBalancePoint = { day: string; balance: number };

/**
 * Saldo acumulado no mês (dia a dia)
 */
export function cumulativeBalanceDaily(params: {
  baseDate: Date;
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  salaries?: Salary[];
  expensePredicate?: (e: Expense) => boolean;
}): DailyBalancePoint[] {
  const { baseDate, expenses, extraIncomes, salaries, expensePredicate } = params;
  const { start, end } = monthInterval(baseDate);

  const days = eachDayOfInterval({ start, end });

  const incomeByDay = new Map<string, number>();

  for (const inc of extraIncomes) {
    const d = toDateSafe(inc.date);
    if (!d || !isInInterval(d, start, end)) continue;
    const key = format(d, "yyyy-MM-dd");
    incomeByDay.set(key, (incomeByDay.get(key) || 0) + Number(inc.amount || 0));
  }

  const salaryValue = getSalaryForMonth(salaries, baseDate);
  if (salaryValue > 0) {
    const month = baseDate.getMonth() + 1;
    const year = baseDate.getFullYear();
    const salaryObj = salaries?.find((s) => s.month === month && s.year === year);

    const dayOfReceipt = salaryObj?.dayOfReceipt ?? 1;
    const salaryDate = new Date(year, baseDate.getMonth(), dayOfReceipt);

    if (isValid(salaryDate) && isInInterval(salaryDate, start, end)) {
      const key = format(salaryDate, "yyyy-MM-dd");
      incomeByDay.set(key, (incomeByDay.get(key) || 0) + salaryValue);
    }
  }

  const expenseByDay = new Map<string, number>();
  for (const e of expenses) {
    if (expensePredicate && !expensePredicate(e)) continue;

    const d = toDateSafe(e.date);
    if (!d || !isInInterval(d, start, end)) continue;

    const key = format(d, "yyyy-MM-dd");
    expenseByDay.set(key, (expenseByDay.get(key) || 0) + Number(e.amount || 0));
  }

  let balance = 0;

  return days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const inc = incomeByDay.get(key) || 0;
    const exp = expenseByDay.get(key) || 0;
    balance += inc - exp;
    return { day: format(d, "dd"), balance };
  });
}

/** =========================
 *  KPIs prontos (cards)
 *  ========================= */

export function monthKPIs(params: {
  baseDate: Date;
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
  salaries?: Salary[];
}) {
  const { baseDate, expenses, extraIncomes, salaries } = params;

  const expensesMonth = filterExpensesByMonth(expenses, baseDate);
  const incomesMonth = filterIncomesByMonth(extraIncomes, baseDate);

  const totalExpenses = sumExpenses(expensesMonth);
  const totalPaid = sumExpenses(expensesMonth, { status: "paid" });
  const totalPlanned = sumExpenses(expensesMonth, { status: "planned" });
  const totalOverdue = sumExpenses(expensesMonth, { status: "overdue" });

  const salaryValue = getSalaryForMonth(salaries, baseDate);
  const extra = sumExtraIncomes(incomesMonth);
  const totalIncome = salaryValue + extra;

  const net = totalIncome - totalExpenses;

  return {
    totalExpenses,
    totalPaid,
    totalPlanned,
    totalOverdue,
    salary: salaryValue,
    extraIncome: extra,
    totalIncome,
    net,
  };
}