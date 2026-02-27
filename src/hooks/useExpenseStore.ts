import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

import type {
  Expense,
  Budget,
  RecurringExpense,
  CreditCard,
  CreditCardInvoice,
  InvoiceItem,
  FinancialAccount,
  AccountTransfer,
  AccountAdjustment,
  AdjustmentReason,
  Salary,
  ExtraIncome,
} from "@/types/expense";

import { getMonthKey } from "@/types/expense";

export interface MonthBalance {
  monthKey: string;
  income: number;
  expenses: number;
  paidInvoices: number;
  carryOver: number;
  balance: number;
}

const LS_MONTH_START_DAY = "finbrasil.settings.monthStartDay";

function clampInt(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${pad2(m)}-${pad2(day)}`;
}

/**
 * Retorna o início do período financeiro para uma data base.
 * Regras:
 * - startDay entre 1 e 28
 * - Se baseDate.getDate() < startDay => período começou no startDay do mês anterior
 * - Senão => período começou no startDay do mês atual
 */
function getFinancialPeriodStart(baseDate: Date, startDay: number) {
  const day = clampInt(startDay, 1, 28);
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();

  if (baseDate.getDate() < day) {
    // mês anterior
    return new Date(y, m - 1, day);
  }

  return new Date(y, m, day);
}

/** Soma meses mantendo o dia (startDay) */
function addMonthsAtStartDay(periodStart: Date, offset: number, startDay: number) {
  const day = clampInt(startDay, 1, 28);
  return new Date(periodStart.getFullYear(), periodStart.getMonth() + offset, day);
}

/**
 * Converte uma data (string YYYY-MM-DD) para a chave do período financeiro (YYYY-MM) conforme startDay.
 * Ex.: startDay=5, data=2026-03-01 => cai no período que começou 2026-02-05 => key "2026-02"
 */
function getFinancialKeyForDate(dateStr: string, startDay: number) {
  const d = new Date(dateStr);
  const ps = getFinancialPeriodStart(d, startDay);
  return `${ps.getFullYear()}-${pad2(ps.getMonth() + 1)}`;
}

export function useExpenseStore() {
  const { user } = useAuth();

  // =========================
  // Config do mês financeiro
  // =========================
  const [monthStartDay, setMonthStartDayState] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(LS_MONTH_START_DAY);
      const parsed = raw ? parseInt(raw, 10) : 1;
      return clampInt(parsed, 1, 28);
    } catch {
      return 1;
    }
  });

  const setMonthStartDay = useCallback((day: number) => {
    const v = clampInt(day, 1, 28);
    setMonthStartDayState(v);
    try {
      localStorage.setItem(LS_MONTH_START_DAY, String(v));
    } catch { }
  }, []);

  // =========================
  // Estado base
  // =========================
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudgetState] = useState<Budget>({ total: 0, byCategory: {} });
  const [prevMonthExpenses, setPrevMonthExpenses] = useState<Expense[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [invoices, setInvoices] = useState<CreditCardInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allBudgets, setAllBudgets] = useState<{ month: number; year: number; total_limit: number }[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [accountTransfers, setAccountTransfers] = useState<AccountTransfer[]>([]);
  const [accountAdjustments, setAccountAdjustments] = useState<AccountAdjustment[]>([]);

  const [salary, setSalary] = useState<Salary | null>(null);
  const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>([]);

  // =========================
  // Período financeiro atual
  // =========================
  const periodStart = useMemo(
    () => getFinancialPeriodStart(currentDate, monthStartDay),
    [currentDate, monthStartDay]
  );

  const monthKey = useMemo(() => getMonthKey(periodStart), [periodStart]);
  const month = periodStart.getMonth() + 1;
  const year = periodStart.getFullYear();

  const startDate = useMemo(() => toISODate(periodStart), [periodStart]);
  const endDate = useMemo(() => {
    const nextStart = addMonthsAtStartDay(periodStart, 1, monthStartDay);
    return toISODate(nextStart);
  }, [periodStart, monthStartDay]);

  /** =========================
   *  Cartões (localStorage)
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    const savedCards = localStorage.getItem(`cards_${user.id}`);
    if (savedCards) setCreditCards(JSON.parse(savedCards));

    const savedInvoices = localStorage.getItem(`invoices_${user.id}`);
    if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`cards_${user.id}`, JSON.stringify(creditCards));
    localStorage.setItem(`invoices_${user.id}`, JSON.stringify(invoices));
  }, [creditCards, invoices, user]);

  /** =========================
   *  Recorrentes (materialização)
   *  ========================= */

  const materializeRecurring = useCallback(
    async (userId: string, m: number, y: number) => {
      const { data: recurrings } = await supabase
        .from("recurring_expenses")
        .select("*")
        .eq("user_id", userId)
        .eq("active", true);

      if (!recurrings?.length) return;

      const { data: instances } = await supabase
        .from("recurring_expense_instances")
        .select("recurring_expense_id")
        .eq("month", m)
        .eq("year", y)
        .in(
          "recurring_expense_id",
          recurrings.map((r: any) => r.id)
        );

      const existingIds = new Set((instances || []).map((i: any) => i.recurring_expense_id));
      const toCreate = recurrings.filter((r: any) => !existingIds.has(r.id));

      for (const rec of toCreate as any[]) {
        const lastDay = new Date(y, m, 0).getDate();
        const day = Math.min(rec.day_of_month, lastDay);
        const date = `${y}-${pad2(m)}-${pad2(day)}`;

        const { data: expense } = await supabase
          .from("expenses")
          .insert({
            user_id: userId,
            description: rec.description,
            amount: rec.amount,
            category: rec.category,
            date,
            status: "paid",
          })
          .select()
          .single();

        if (expense) {
          await supabase.from("recurring_expense_instances").insert({
            recurring_expense_id: rec.id,
            expense_id: expense.id,
            month: m,
            year: y,
          });
        }
      }
    },
    []
  );

  /** =========================
   *  Despesas do período atual
   *  ========================= */

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const load = async () => {
      await materializeRecurring(user.id, month, year);

      const { data } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lt("date", endDate)
        .order("date", { ascending: false });

      const { data: instances } = await supabase
        .from("recurring_expense_instances")
        .select("expense_id")
        .eq("month", month)
        .eq("year", year);

      const recurringExpenseIds = new Set((instances || []).map((i: any) => i.expense_id));

      setExpenses(
        (data || []).map((e: any) => ({
          id: e.id,
          date: e.date,
          description: e.description,
          category: e.category,
          amount: Number(e.amount),
          isRecurring: recurringExpenseIds.has(e.id),
          status: (e.status as Expense["status"]) || "paid",
          accountId: e.account_id || undefined,
          cardId: e.card_id || undefined,
        }))
      );

      setLoading(false);
    };

    load();
  }, [user, month, year, startDate, endDate, materializeRecurring]);

  /** =========================
   *  Despesas do período anterior
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    const prevStart = addMonthsAtStartDay(periodStart, -1, monthStartDay);
    const prevStartISO = toISODate(prevStart);
    const currStartISO = toISODate(periodStart);

    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", prevStartISO)
      .lt("date", currStartISO)
      .then(({ data }) => {
        setPrevMonthExpenses(
          (data || []).map((e: any) => ({
            id: e.id,
            date: e.date,
            description: e.description,
            category: e.category,
            amount: Number(e.amount),
            status: (e.status as Expense["status"]) || "paid",
          }))
        );
      });
  }, [user, periodStart, monthStartDay]);

  /** =========================
   *  Budget (por período financeiro)
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", month)
      .eq("year", year)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBudgetState({
            total: Number((data as any).total_limit),
            byCategory: ((data as any).category_limits as Record<string, number>) || {},
          });
        } else {
          setBudgetState({ total: 0, byCategory: {} });
        }
      });
  }, [user, month, year]);

  /** =========================
   *  Categorias customizadas
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    supabase
      .from("custom_categories")
      .select("name")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setCustomCategories((data || []).map((c: any) => c.name));
      });
  }, [user]);

  /** =========================
   *  Recorrentes (lista)
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    supabase
      .from("recurring_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRecurringExpenses(
          (data || []).map((r: any) => ({
            id: r.id,
            description: r.description,
            category: r.category,
            amount: Number(r.amount),
            dayOfMonth: r.day_of_month,
            active: r.active,
          }))
        );
      });
  }, [user]);

  /** =========================
   *  Contas financeiras
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    supabase
      .from("financial_accounts" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => {
        setFinancialAccounts(
          (data || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            balance: Number(a.balance),
            color: a.color,
            icon: a.icon,
            isActive: a.is_active,
            appliedValue: Number(a.applied_value || 0),
            currentValue: Number(a.current_value || 0),
          }))
        );
      });
  }, [user]);

  /** =========================
   *  Transferências
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    supabase
      .from("account_transfers" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data }: any) => {
        setAccountTransfers(
          (data || []).map((t: any) => ({
            id: t.id,
            fromAccountId: t.from_account_id,
            toAccountId: t.to_account_id,
            amount: Number(t.amount),
            description: t.description,
            date: t.date,
          }))
        );
      });
  }, [user]);

  /** =========================
   *  Ajustes de conta
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    supabase
      .from("account_adjustments" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data }: any) => {
        setAccountAdjustments(
          (data || []).map((a: any) => ({
            id: a.id,
            accountId: a.account_id,
            amount: Number(a.amount),
            reason: a.reason,
            description: a.description,
            date: a.date,
          }))
        );
      });
  }, [user]);

  /** =========================
   *  Salário (período atual + auto-repeat)
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    const loadSalary = async () => {
      const { data } = await supabase
        .from("salaries" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (data) {
        const d = data as any;
        setSalary({
          id: d.id,
          amount: Number(d.amount),
          month: d.month,
          year: d.year,
          dayOfReceipt: d.day_of_receipt,
          autoRepeat: d.auto_repeat,
        });
        return;
      }

      const prevStart = addMonthsAtStartDay(periodStart, -1, monthStartDay);
      const prevM = prevStart.getMonth() + 1;
      const prevY = prevStart.getFullYear();

      const { data: prevData } = await supabase
        .from("salaries" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("month", prevM)
        .eq("year", prevY)
        .eq("auto_repeat", true)
        .maybeSingle();

      if (!prevData) {
        setSalary(null);
        return;
      }

      const p = prevData as any;

      const { data: newSalary } = await supabase
        .from("salaries" as any)
        .insert({
          user_id: user.id,
          amount: p.amount,
          month,
          year,
          day_of_receipt: p.day_of_receipt,
          auto_repeat: true,
        } as any)
        .select()
        .single();

      if (newSalary) {
        const n = newSalary as any;
        setSalary({
          id: n.id,
          amount: Number(n.amount),
          month: n.month,
          year: n.year,
          dayOfReceipt: n.day_of_receipt,
          autoRepeat: n.auto_repeat,
        });
      } else {
        setSalary(null);
      }
    };

    loadSalary();
  }, [user, month, year, periodStart, monthStartDay]);

  /** =========================
   *  Receitas extras (período atual)
   *  ========================= */

  useEffect(() => {
    if (!user) return;

    supabase
      .from("extra_incomes" as any)
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDate)
      .order("date", { ascending: false })
      .then(({ data }: any) => {
        setExtraIncomes(
          (data || []).map((e: any) => ({
            id: e.id,
            amount: Number(e.amount),
            description: e.description,
            category: e.category,
            date: e.date,
          }))
        );
      });
  }, [user, startDate, endDate]);

  /** =========================
   *  Load ALL (carry over / saldo acumulado)
   *  ========================= */

  const [allSalaries, setAllSalaries] = useState<{ month: number; year: number; amount: number }[]>([]);
  const [allExtraIncomes, setAllExtraIncomes] = useState<{ date: string; amount: number }[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadAll = async () => {
      const { data: expData } = await supabase
        .from("expenses")
        .select("id, date, amount, status")
        .eq("user_id", user.id);

      setAllExpenses(
        (expData || []).map((e: any) => ({
          id: e.id,
          date: e.date,
          description: "",
          category: "",
          amount: Number(e.amount),
          status: (e.status as Expense["status"]) || "paid",
        }))
      );

      const { data: budData } = await supabase
        .from("budgets")
        .select("month, year, total_limit")
        .eq("user_id", user.id);

      setAllBudgets((budData || []).map((b: any) => ({ month: b.month, year: b.year, total_limit: Number(b.total_limit) })));

      const { data: salData } = await supabase
        .from("salaries" as any)
        .select("month, year, amount")
        .eq("user_id", user.id);

      setAllSalaries(((salData as any) || []).map((s: any) => ({ month: s.month, year: s.year, amount: Number(s.amount) })));

      const { data: extraData } = await supabase
        .from("extra_incomes" as any)
        .select("date, amount")
        .eq("user_id", user.id);

      setAllExtraIncomes(((extraData as any) || []).map((e: any) => ({ date: e.date, amount: Number(e.amount) })));
    };

    loadAll();
  }, [user]);

  /** =========================
   *  Month balance (carry over) - AGORA POR PERÍODO FINANCEIRO
   *  ========================= */

  const monthBalance = useMemo((): MonthBalance => {
    const mk = getFinancialKeyForDate(toISODate(periodStart), monthStartDay);

    const allMonthKeys = new Set<string>();

    // despesas
    allExpenses.forEach((e) => {
      allMonthKeys.add(getFinancialKeyForDate(e.date, monthStartDay));
    });

    // budgets (assumindo que month/year já representam o período financeiro)
    allBudgets.forEach((b) => {
      allMonthKeys.add(`${b.year}-${pad2(b.month)}`);
    });

    // salários
    allSalaries.forEach((s) => {
      allMonthKeys.add(`${s.year}-${pad2(s.month)}`);
    });

    // extras
    allExtraIncomes.forEach((e) => {
      allMonthKeys.add(getFinancialKeyForDate(e.date, monthStartDay));
    });

    allMonthKeys.add(mk);

    const sortedKeys = Array.from(allMonthKeys).sort();

    let carryOver = 0;

    let result: MonthBalance = {
      monthKey: mk,
      income: 0,
      expenses: 0,
      paidInvoices: 0,
      carryOver: 0,
      balance: 0,
    };

    for (const key of sortedKeys) {
      const [y, m] = key.split("-").map(Number);

      // Income = salary + extra incomes + (budget legado se você usa como "entrada")
      const salaryIncome = allSalaries.find((s) => s.month === m && s.year === y)?.amount || 0;

      const budgetIncome = allBudgets.find((b) => b.month === m && b.year === y)?.total_limit || 0;

      const extraIncome = allExtraIncomes
        .filter((e) => getFinancialKeyForDate(e.date, monthStartDay) === `${y}-${pad2(m)}`)
        .reduce((s, e) => s + e.amount, 0);

      const monthIncome = salaryIncome + extraIncome + budgetIncome;

      const monthExpenses = allExpenses
        .filter((e) => getFinancialKeyForDate(e.date, monthStartDay) === `${y}-${pad2(m)}`)
        .reduce((s, e) => s + e.amount, 0);

      // Invoices: invoice.month vem como "YYYY-MM" (calendário).
      // Aqui mapeamos esse "mês calendário" para o período financeiro correspondente.
      const paidInvoiceTotal = invoices
        .filter((i) => {
          const invoiceKey = getFinancialKeyForDate(`${i.month}-01`, monthStartDay);
          return invoiceKey === `${y}-${pad2(m)}` && i.isPaid;
        })
        .reduce((s, i) => s + i.items.reduce((si, item) => si + Number(item.amount || 0), 0), 0);

      const balance = carryOver + monthIncome - monthExpenses - paidInvoiceTotal;

      if (key === mk) {
        result = {
          monthKey: mk,
          income: monthIncome,
          expenses: monthExpenses,
          paidInvoices: paidInvoiceTotal,
          carryOver,
          balance,
        };
      }

      carryOver = balance;

      if (key >= mk) break;
    }

    return result;
  }, [allExpenses, allBudgets, allSalaries, allExtraIncomes, invoices, periodStart, monthStartDay]);

  /** =========================
   *  Expenses CRUD
   *  ========================= */

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id">) => {
      if (!user) return;

      const insertData: any = {
        user_id: user.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        status: expense.status || "paid",
      };

      if (expense.accountId) insertData.account_id = expense.accountId;
      if (expense.cardId) insertData.card_id = expense.cardId;

      const { data, error } = await supabase.from("expenses").insert(insertData).select().single();

      if (data && !error) {
        setExpenses((prev) => [
          {
            id: data.id,
            date: data.date,
            description: data.description,
            category: data.category,
            amount: Number(data.amount),
            status: ((data as any).status as Expense["status"]) || "paid",
            accountId: (data as any).account_id || undefined,
            cardId: (data as any).card_id || undefined,
          },
          ...prev,
        ]);
      }
    },
    [user]
  );

  const updateExpense = useCallback(
    async (id: string, updates: Partial<Omit<Expense, "id">>) => {
      if (!user) return;

      const { error } = await supabase.from("expenses").update(updates).eq("id", id).eq("user_id", user.id);

      if (!error) {
        setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      }
    },
    [user]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!user) return;

      const { error } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);

      if (!error) setExpenses((prev) => prev.filter((e) => e.id !== id));
    },
    [user]
  );

  /** =========================
   *  Budget CRUD
   *  ========================= */

  const setBudget = useCallback(
    async (newBudget: Budget) => {
      if (!user) return;

      const { error } = await supabase.from("budgets").upsert(
        {
          user_id: user.id,
          month,
          year,
          total_limit: newBudget.total,
          category_limits: newBudget.byCategory,
        },
        { onConflict: "user_id,month,year" }
      );

      if (!error) setBudgetState(newBudget);
    },
    [user, month, year]
  );

  /** =========================
   *  Categorias
   *  ========================= */

  const addCustomCategory = useCallback(
    async (cat: string) => {
      if (!user || customCategories.includes(cat)) return;

      const { error } = await supabase.from("custom_categories").insert({ user_id: user.id, name: cat });

      if (!error) setCustomCategories((prev) => [...prev, cat]);
    },
    [user, customCategories]
  );

  /** =========================
   *  Recorrentes CRUD
   *  ========================= */

  const addRecurringExpense = useCallback(
    async (recurring: Omit<RecurringExpense, "id" | "active">) => {
      if (!user) return;

      const { data, error } = await supabase
        .from("recurring_expenses")
        .insert({
          user_id: user.id,
          description: recurring.description,
          amount: recurring.amount,
          category: recurring.category,
          day_of_month: recurring.dayOfMonth,
        })
        .select()
        .single();

      if (data && !error) {
        setRecurringExpenses((prev) => [
          {
            id: (data as any).id,
            description: (data as any).description,
            category: (data as any).category,
            amount: Number((data as any).amount),
            dayOfMonth: (data as any).day_of_month,
            active: (data as any).active,
          },
          ...prev,
        ]);

        const lastDay = new Date(year, month, 0).getDate();
        const day = Math.min(recurring.dayOfMonth, lastDay);
        const date = `${year}-${pad2(month)}-${pad2(day)}`;

        const { data: expense } = await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            description: recurring.description,
            amount: recurring.amount,
            category: recurring.category,
            date,
            status: "paid",
          })
          .select()
          .single();

        if (expense) {
          await supabase.from("recurring_expense_instances").insert({
            recurring_expense_id: (data as any).id,
            expense_id: (expense as any).id,
            month,
            year,
          });

          setExpenses((prev) => [
            {
              id: (expense as any).id,
              date: (expense as any).date,
              description: (expense as any).description,
              category: (expense as any).category,
              amount: Number((expense as any).amount),
              isRecurring: true,
              status: ((expense as any).status as Expense["status"]) || "paid",
            },
            ...prev,
          ]);
        }
      }
    },
    [user, month, year]
  );

  const toggleRecurringExpense = useCallback(
    async (id: string, active: boolean) => {
      if (!user) return;

      const { error } = await supabase.from("recurring_expenses").update({ active }).eq("id", id).eq("user_id", user.id);

      if (!error) setRecurringExpenses((prev) => prev.map((r) => (r.id === id ? { ...r, active } : r)));
    },
    [user]
  );

  const deleteRecurringExpense = useCallback(
    async (id: string) => {
      if (!user) return;

      const { error } = await supabase.from("recurring_expenses").delete().eq("id", id).eq("user_id", user.id);

      if (!error) setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
    },
    [user]
  );

  /** =========================
   *  Cartões CRUD (local)
   *  ========================= */

  const addCreditCard = useCallback((card: Omit<CreditCard, "id">) => {
    const newCard = { ...card, id: crypto.randomUUID() };
    setCreditCards((prev) => [...prev, newCard]);
  }, []);

  const updateCreditCard = useCallback((id: string, updates: Partial<CreditCard>) => {
    setCreditCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const deleteCreditCard = useCallback((id: string) => {
    setCreditCards((prev) => prev.filter((c) => c.id !== id));
    setInvoices((prev) => prev.filter((i) => i.cardId !== id));
  }, []);

  const addInvoiceItem = useCallback((cardId: string, month: string, item: Omit<InvoiceItem, "id">) => {
    setInvoices((prev) => {
      const existingInvoice = prev.find((i) => i.cardId === cardId && i.month === month);
      const newItem: InvoiceItem = { ...item, id: crypto.randomUUID() };

      if (existingInvoice) {
        return prev.map((i) => (i.id === existingInvoice.id ? { ...i, items: [...i.items, newItem] } : i));
      }

      return [...prev, { id: crypto.randomUUID(), cardId, month, items: [newItem], isPaid: false }];
    });
  }, []);

  const addInstallments = useCallback((cardId: string, items: { month: string; item: Omit<InvoiceItem, "id"> }[]) => {
    setInvoices((prev) => {
      let updated = [...prev];

      for (const { month, item } of items) {
        const newItem: InvoiceItem = { ...item, id: crypto.randomUUID() };
        const existingIdx = updated.findIndex((i) => i.cardId === cardId && i.month === month);

        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], items: [...updated[existingIdx].items, newItem] };
        } else {
          updated = [...updated, { id: crypto.randomUUID(), cardId, month, items: [newItem], isPaid: false }];
        }
      }

      return updated;
    });
  }, []);

  const removeInstallmentGroup = useCallback((cardId: string, groupId: string) => {
    setInvoices((prev) =>
      prev
        .map((inv) => {
          if (inv.cardId !== cardId) return inv;
          return { ...inv, items: inv.items.filter((i) => i.installmentGroupId !== groupId) };
        })
        .filter((inv) => inv.items.length > 0 || inv.isPaid)
    );
  }, []);

  const removeInvoiceItem = useCallback((invoiceId: string, itemId: string) => {
    setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? { ...i, items: i.items.filter((it) => it.id !== itemId) } : i)));
  }, []);

  const toggleInvoicePaid = useCallback((invoiceId: string) => {
    setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? { ...i, isPaid: !i.isPaid } : i)));
  }, []);

  /** =========================
   *  Navegação de período financeiro
   *  ========================= */

  const navigateMonth = useCallback(
    (offset: number) => {
      setCurrentDate((prev) => {
        const currentPeriod = getFinancialPeriodStart(prev, monthStartDay);
        const nextPeriod = addMonthsAtStartDay(currentPeriod, offset, monthStartDay);
        return nextPeriod;
      });
    },
    [monthStartDay]
  );

  const goToMonth = useCallback(
    (y: number, m: number) => {
      // Mantém a semântica: m é 0-based (como Date), então new Date(y, m, startDay)
      setCurrentDate(new Date(y, m, clampInt(monthStartDay, 1, 28)));
    },
    [monthStartDay]
  );

  /** =========================
   *  Contas CRUD
   *  ========================= */

  const addFinancialAccount = useCallback(
    async (account: Omit<FinancialAccount, "id" | "isActive">) => {
      if (!user) return;

      const insertData: any = {
        user_id: user.id,
        name: account.name,
        type: account.type,
        balance: account.balance,
        color: account.color,
        icon: account.icon,
      };

      if (account.appliedValue !== undefined) insertData.applied_value = account.appliedValue;
      if (account.currentValue !== undefined) insertData.current_value = account.currentValue;

      const { data, error } = await supabase.from("financial_accounts" as any).insert(insertData as any).select().single();

      if (data && !error) {
        const d = data as any;
        setFinancialAccounts((prev) => [
          ...prev,
          {
            id: d.id,
            name: d.name,
            type: d.type,
            balance: Number(d.balance),
            color: d.color,
            icon: d.icon,
            isActive: d.is_active,
            appliedValue: Number(d.applied_value || 0),
            currentValue: Number(d.current_value || 0),
          },
        ]);
      }
    },
    [user]
  );

  const updateFinancialAccount = useCallback(
    async (id: string, updates: Partial<FinancialAccount>) => {
      if (!user) return;

      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.type !== undefined) dbUpdates.type = updates.type;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
      if (updates.appliedValue !== undefined) dbUpdates.applied_value = updates.appliedValue;
      if (updates.currentValue !== undefined) dbUpdates.current_value = updates.currentValue;
      if (updates.balance !== undefined) dbUpdates.balance = updates.balance;

      const { error } = await supabase.from("financial_accounts" as any).update(dbUpdates).eq("id", id).eq("user_id", user.id);

      if (!error) {
        setFinancialAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
      }
    },
    [user]
  );

  const deleteFinancialAccount = useCallback(
    async (id: string) => {
      if (!user) return;

      const { error } = await supabase.from("financial_accounts" as any).delete().eq("id", id).eq("user_id", user.id);

      if (!error) setFinancialAccounts((prev) => prev.filter((a) => a.id !== id));
    },
    [user]
  );

  const transferBetweenAccounts = useCallback(
    async (fromId: string, toId: string, amount: number, description?: string) => {
      if (!user) return;

      const { data, error } = await supabase
        .from("account_transfers" as any)
        .insert({
          user_id: user.id,
          from_account_id: fromId,
          to_account_id: toId,
          amount,
          description: description || "Transferência",
        } as any)
        .select()
        .single();

      if (data && !error) {
        const t = data as any;
        setAccountTransfers((prev) => [
          {
            id: t.id,
            fromAccountId: t.from_account_id,
            toAccountId: t.to_account_id,
            amount: Number(t.amount),
            description: t.description,
            date: t.date,
          },
          ...prev,
        ]);
      }
    },
    [user]
  );

  const addAccountAdjustment = useCallback(
    async (accountId: string, amount: number, reason: AdjustmentReason, description?: string) => {
      if (!user) return;

      const { data, error } = await supabase
        .from("account_adjustments" as any)
        .insert({ account_id: accountId, user_id: user.id, amount, reason, description } as any)
        .select()
        .single();

      if (data && !error) {
        const a = data as any;
        setAccountAdjustments((prev) => [
          {
            id: a.id,
            accountId: a.account_id,
            amount: Number(a.amount),
            reason: a.reason,
            description: a.description,
            date: a.date,
          },
          ...prev,
        ]);
      }
    },
    [user]
  );

  const deleteAccountAdjustment = useCallback(
    async (id: string) => {
      if (!user) return;

      const { error } = await supabase.from("account_adjustments" as any).delete().eq("id", id);

      if (!error) setAccountAdjustments((prev) => prev.filter((a) => a.id !== id));
    },
    [user]
  );

  const toggleAccountArchive = useCallback(
    async (id: string, isActive: boolean) => {
      if (!user) return;

      const { error } = await supabase
        .from("financial_accounts" as any)
        .update({ is_active: isActive } as any)
        .eq("id", id)
        .eq("user_id", user.id);

      if (!error) setFinancialAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, isActive } : a)));
    },
    [user]
  );

  /** =========================
   *  Salário CRUD
   *  ========================= */

  const saveSalary = useCallback(
    async (amount: number, dayOfReceipt: number, autoRepeat: boolean) => {
      if (!user) return;

      const insertData: any = {
        user_id: user.id,
        amount,
        month,
        year,
        day_of_receipt: dayOfReceipt,
        auto_repeat: autoRepeat,
      };

      if (salary) {
        const { error } = await supabase
          .from("salaries" as any)
          .update({ amount, day_of_receipt: dayOfReceipt, auto_repeat: autoRepeat } as any)
          .eq("id", salary.id);

        if (!error) setSalary({ ...salary, amount, dayOfReceipt, autoRepeat });
      } else {
        const { data, error } = await supabase.from("salaries" as any).insert(insertData as any).select().single();

        if (data && !error) {
          const d = data as any;
          setSalary({
            id: d.id,
            amount: Number(d.amount),
            month: d.month,
            year: d.year,
            dayOfReceipt: d.day_of_receipt,
            autoRepeat: d.auto_repeat,
          });
        }
      }
    },
    [user, month, year, salary]
  );

  const deleteSalary = useCallback(async () => {
    if (!user || !salary) return;

    const { error } = await supabase.from("salaries" as any).delete().eq("id", salary.id);

    if (!error) setSalary(null);
  }, [user, salary]);

  /** =========================
   *  Extra Income CRUD
   *  ========================= */

  const addExtraIncome = useCallback(
    async (income: Omit<ExtraIncome, "id">) => {
      if (!user) return;

      const { data, error } = await supabase
        .from("extra_incomes" as any)
        .insert({
          user_id: user.id,
          amount: income.amount,
          description: income.description,
          category: income.category,
          date: income.date,
        } as any)
        .select()
        .single();

      if (data && !error) {
        const d = data as any;
        setExtraIncomes((prev) => [
          {
            id: d.id,
            amount: Number(d.amount),
            description: d.description,
            category: d.category,
            date: d.date,
          },
          ...prev,
        ]);
      }
    },
    [user]
  );

  const updateExtraIncome = useCallback(
    async (id: string, updates: Partial<Omit<ExtraIncome, "id">>) => {
      if (!user) return;

      const { error } = await supabase.from("extra_incomes" as any).update(updates as any).eq("id", id);

      if (!error) setExtraIncomes((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    },
    [user]
  );

  const deleteExtraIncome = useCallback(
    async (id: string) => {
      if (!user) return;

      const { error } = await supabase.from("extra_incomes" as any).delete().eq("id", id);

      if (!error) setExtraIncomes((prev) => prev.filter((e) => e.id !== id));
    },
    [user]
  );

  return {
    // período / navegação
    currentDate,
    monthKey,
    monthStartDay,
    setMonthStartDay,

    // dados
    expenses,
    budget,
    prevMonthExpenses,
    customCategories,
    recurringExpenses,
    creditCards,
    invoices,
    loading,
    monthBalance,
    financialAccounts,
    accountTransfers,
    accountAdjustments,
    salary,
    extraIncomes,

    // CRUD
    addExpense,
    updateExpense,
    deleteExpense,
    setBudget,
    addCustomCategory,
    addRecurringExpense,
    toggleRecurringExpense,
    deleteRecurringExpense,

    addCreditCard,
    updateCreditCard,
    deleteCreditCard,
    addInvoiceItem,
    addInstallments,
    removeInstallmentGroup,
    removeInvoiceItem,
    toggleInvoicePaid,

    navigateMonth,
    goToMonth,

    addFinancialAccount,
    updateFinancialAccount,
    deleteFinancialAccount,
    transferBetweenAccounts,
    addAccountAdjustment,
    deleteAccountAdjustment,
    toggleAccountArchive,

    saveSalary,
    deleteSalary,
    addExtraIncome,
    updateExtraIncome,
    deleteExtraIncome,
  };
}