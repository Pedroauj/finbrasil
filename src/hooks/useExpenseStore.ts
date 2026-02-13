import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Expense, Budget, RecurringExpense, CreditCard, CreditCardInvoice, InvoiceItem, getMonthKey } from "@/types/expense";
import { useAuth } from "./useAuth";

export interface MonthBalance {
  monthKey: string;
  income: number;
  expenses: number;
  paidInvoices: number;
  carryOver: number;
  balance: number;
}

export function useExpenseStore() {
  const { user } = useAuth();
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

  const monthKey = getMonthKey(currentDate);
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Load Credit Cards from localStorage (Mocking Supabase for new feature)
  useEffect(() => {
    if (!user) return;
    const savedCards = localStorage.getItem(`cards_${user.id}`);
    if (savedCards) {
      setCreditCards(JSON.parse(savedCards));
    }
    const savedInvoices = localStorage.getItem(`invoices_${user.id}`);
    if (savedInvoices) {
      setInvoices(JSON.parse(savedInvoices));
    }
  }, [user]);

  // Save Credit Cards and Invoices to localStorage
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`cards_${user.id}`, JSON.stringify(creditCards));
    localStorage.setItem(`invoices_${user.id}`, JSON.stringify(invoices));
  }, [creditCards, invoices, user]);

  // Materialize recurring expenses for a given month
  const materializeRecurring = useCallback(async (userId: string, m: number, y: number) => {
    const { data: recurrings } = await supabase
      .from("recurring_expenses")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true);

    if (!recurrings || recurrings.length === 0) return;

    const { data: instances } = await supabase
      .from("recurring_expense_instances")
      .select("recurring_expense_id")
      .eq("month", m)
      .eq("year", y)
      .in("recurring_expense_id", recurrings.map(r => r.id));

    const existingIds = new Set((instances || []).map(i => i.recurring_expense_id));
    const toCreate = recurrings.filter(r => !existingIds.has(r.id));

    for (const rec of toCreate) {
      const lastDay = new Date(y, m, 0).getDate();
      const day = Math.min(rec.day_of_month, lastDay);
      const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const { data: expense } = await supabase
        .from("expenses")
        .insert({
          user_id: userId,
          description: rec.description,
          amount: rec.amount,
          category: rec.category,
          date,
        })
        .select()
        .single();

      if (expense) {
        await supabase
          .from("recurring_expense_instances")
          .insert({
            recurring_expense_id: rec.id,
            expense_id: expense.id,
            month: m,
            year: y,
          });
      }
    }
  }, []);

  // Load expenses for current month
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const load = async () => {
      await materializeRecurring(user.id, month, year);

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endMonth = month === 12 ? 1 : month + 1;
      const endYear = month === 12 ? year + 1 : year;
      const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

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

      const recurringExpenseIds = new Set((instances || []).map(i => i.expense_id));

      setExpenses(
        (data || []).map((e) => ({
          id: e.id,
          date: e.date,
          description: e.description,
          category: e.category,
          amount: Number(e.amount),
          isRecurring: recurringExpenseIds.has(e.id),
        }))
      );
      setLoading(false);
    };

    load();
  }, [user, month, year, materializeRecurring]);

  // Load previous month expenses
  useEffect(() => {
    if (!user) return;
    const prevDate = new Date(year, month - 2);
    const pm = prevDate.getMonth() + 1;
    const py = prevDate.getFullYear();
    const startDate = `${py}-${String(pm).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-01`;

    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDate)
      .then(({ data }) => {
        setPrevMonthExpenses(
          (data || []).map((e) => ({
            id: e.id,
            date: e.date,
            description: e.description,
            category: e.category,
            amount: Number(e.amount),
          }))
        );
      });
  }, [user, month, year]);

  // Load budget
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
            total: Number(data.total_limit),
            byCategory: (data.category_limits as Record<string, number>) || {},
          });
        } else {
          setBudgetState({ total: 0, byCategory: {} });
        }
      });
  }, [user, month, year]);

  // Load custom categories
  useEffect(() => {
    if (!user) return;
    supabase
      .from("custom_categories")
      .select("name")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setCustomCategories((data || []).map((c) => c.name));
      });
  }, [user]);

  // Load recurring expenses
  useEffect(() => {
    if (!user) return;
    supabase
      .from("recurring_expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRecurringExpenses(
          (data || []).map((r) => ({
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

  // Load all expenses and budgets for cumulative balance
  useEffect(() => {
    if (!user) return;
    const loadAll = async () => {
      const { data: expData } = await supabase
        .from("expenses")
        .select("id, date, amount")
        .eq("user_id", user.id);
      setAllExpenses((expData || []).map(e => ({ id: e.id, date: e.date, description: "", category: "", amount: Number(e.amount) })));

      const { data: budData } = await supabase
        .from("budgets")
        .select("month, year, total_limit")
        .eq("user_id", user.id);
      setAllBudgets((budData || []).map(b => ({ month: b.month, year: b.year, total_limit: Number(b.total_limit) })));
    };
    loadAll();
  }, [user, expenses, budget]);

  // Calculate cumulative balance
  const monthBalance = useMemo((): MonthBalance => {
    const mk = getMonthKey(currentDate);
    
    // Gather all unique month keys from expenses and budgets
    const allMonthKeys = new Set<string>();
    allExpenses.forEach(e => {
      const d = new Date(e.date);
      allMonthKeys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    allBudgets.forEach(b => {
      allMonthKeys.add(`${b.year}-${String(b.month).padStart(2, "0")}`);
    });
    allMonthKeys.add(mk);

    const sortedKeys = Array.from(allMonthKeys).sort();
    
    let carryOver = 0;
    let result: MonthBalance = { monthKey: mk, income: 0, expenses: 0, paidInvoices: 0, carryOver: 0, balance: 0 };

    for (const key of sortedKeys) {
      const [y, m] = key.split("-").map(Number);
      
      const monthIncome = allBudgets.find(b => b.month === m && b.year === y)?.total_limit || 0;
      const monthExpenses = allExpenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getFullYear() === y && d.getMonth() + 1 === m;
        })
        .reduce((s, e) => s + e.amount, 0);
      
      // Paid invoices for this month
      const monthKeyStr = `${y}-${String(m).padStart(2, "0")}`;
      const paidInvoiceTotal = invoices
        .filter(i => i.month === monthKeyStr && i.isPaid)
        .reduce((s, i) => s + i.items.reduce((si, item) => si + item.amount, 0), 0);

      const balance = carryOver + monthIncome - monthExpenses - paidInvoiceTotal;

      if (key === mk) {
        result = { monthKey: mk, income: monthIncome, expenses: monthExpenses, paidInvoices: paidInvoiceTotal, carryOver, balance };
      }

      carryOver = balance;

      if (key >= mk) break;
    }

    return result;
  }, [allExpenses, allBudgets, invoices, currentDate]);

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id">) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          user_id: user.id,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
        })
        .select()
        .single();

      if (data && !error) {
        setExpenses((prev) => [
          {
            id: data.id,
            date: data.date,
            description: data.description,
            category: data.category,
            amount: Number(data.amount),
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
      const { error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (!error) {
        setExpenses((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
        );
      }
    },
    [user]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (!error) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      }
    },
    [user]
  );

  const setBudget = useCallback(
    async (newBudget: Budget) => {
      if (!user) return;
      const { error } = await supabase
        .from("budgets")
        .upsert(
          {
            user_id: user.id,
            month,
            year,
            total_limit: newBudget.total,
            category_limits: newBudget.byCategory,
          },
          { onConflict: "user_id,month,year" }
        );

      if (!error) {
        setBudgetState(newBudget);
      }
    },
    [user, month, year]
  );

  const addCustomCategory = useCallback(
    async (cat: string) => {
      if (!user || customCategories.includes(cat)) return;
      const { error } = await supabase
        .from("custom_categories")
        .insert({ user_id: user.id, name: cat });

      if (!error) {
        setCustomCategories((prev) => [...prev, cat]);
      }
    },
    [user, customCategories]
  );

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
            id: data.id,
            description: data.description,
            category: data.category,
            amount: Number(data.amount),
            dayOfMonth: data.day_of_month,
            active: data.active,
          },
          ...prev,
        ]);

        const lastDay = new Date(year, month, 0).getDate();
        const day = Math.min(recurring.dayOfMonth, lastDay);
        const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const { data: expense } = await supabase
          .from("expenses")
          .insert({
            user_id: user.id,
            description: recurring.description,
            amount: recurring.amount,
            category: recurring.category,
            date,
          })
          .select()
          .single();

        if (expense) {
          await supabase
            .from("recurring_expense_instances")
            .insert({
              recurring_expense_id: data.id,
              expense_id: expense.id,
              month,
              year,
            });

          setExpenses((prev) => [
            {
              id: expense.id,
              date: expense.date,
              description: expense.description,
              category: expense.category,
              amount: Number(expense.amount),
              isRecurring: true,
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
      const { error } = await supabase
        .from("recurring_expenses")
        .update({ active })
        .eq("id", id)
        .eq("user_id", user.id);

      if (!error) {
        setRecurringExpenses((prev) =>
          prev.map((r) => (r.id === id ? { ...r, active } : r))
        );
      }
    },
    [user]
  );

  const deleteRecurringExpense = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from("recurring_expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (!error) {
        setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
      }
    },
    [user]
  );

  // Credit Card Methods
  const addCreditCard = useCallback((card: Omit<CreditCard, "id">) => {
    const newCard = { ...card, id: crypto.randomUUID() };
    setCreditCards(prev => [...prev, newCard]);
  }, []);

  const updateCreditCard = useCallback((id: string, updates: Partial<CreditCard>) => {
    setCreditCards(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCreditCard = useCallback((id: string) => {
    setCreditCards(prev => prev.filter(c => c.id !== id));
    setInvoices(prev => prev.filter(i => i.cardId !== id));
  }, []);

  const addInvoiceItem = useCallback((cardId: string, month: string, item: Omit<InvoiceItem, "id">) => {
    setInvoices(prev => {
      const existingInvoice = prev.find(i => i.cardId === cardId && i.month === month);
      const newItem = { ...item, id: crypto.randomUUID() };
      
      if (existingInvoice) {
        return prev.map(i => i.id === existingInvoice.id 
          ? { ...i, items: [...i.items, newItem] } 
          : i
        );
      } else {
        return [...prev, {
          id: crypto.randomUUID(),
          cardId,
          month,
          items: [newItem],
          isPaid: false
        }];
      }
    });
  }, []);

  const removeInvoiceItem = useCallback((invoiceId: string, itemId: string) => {
    setInvoices(prev => prev.map(i => i.id === invoiceId 
      ? { ...i, items: i.items.filter(item => item.id !== itemId) } 
      : i
    ));
  }, []);

  const toggleInvoicePaid = useCallback((invoiceId: string) => {
    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, isPaid: !i.isPaid } : i));
  }, []);

  const navigateMonth = useCallback((offset: number) => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + offset);
      return d;
    });
  }, []);

  const goToMonth = useCallback((y: number, m: number) => {
    setCurrentDate(new Date(y, m));
  }, []);

  return {
    currentDate,
    monthKey,
    expenses,
    budget,
    prevMonthExpenses,
    customCategories,
    recurringExpenses,
    creditCards,
    invoices,
    loading,
    monthBalance,
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
    removeInvoiceItem,
    toggleInvoicePaid,
    navigateMonth,
    goToMonth,
  };
}
