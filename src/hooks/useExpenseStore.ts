import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Expense, Budget, getMonthKey } from "@/types/expense";
import { useAuth } from "./useAuth";

export function useExpenseStore() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budget, setBudgetState] = useState<Budget>({ total: 0, byCategory: {} });
  const [prevMonthExpenses, setPrevMonthExpenses] = useState<Expense[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const monthKey = getMonthKey(currentDate);
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  // Load expenses for current month
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDate)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setExpenses(
          (data || []).map((e) => ({
            id: e.id,
            date: e.date,
            description: e.description,
            category: e.category,
            amount: Number(e.amount),
          }))
        );
        setLoading(false);
      });
  }, [user, month, year]);

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
    loading,
    addExpense,
    updateExpense,
    deleteExpense,
    setBudget,
    addCustomCategory,
    navigateMonth,
    goToMonth,
  };
}
