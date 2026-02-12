import { useState, useCallback, useEffect } from "react";
import { Expense, Budget, MonthData, getMonthKey } from "@/types/expense";

function loadMonth(key: string): MonthData {
  try {
    const raw = localStorage.getItem(`expenses_${key}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { expenses: [], budget: { total: 0, byCategory: {} } };
}

function saveMonth(key: string, data: MonthData) {
  localStorage.setItem(`expenses_${key}`, JSON.stringify(data));
}

function loadCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem("custom_categories");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveCustomCategories(cats: string[]) {
  localStorage.setItem("custom_categories", JSON.stringify(cats));
}

export function useExpenseStore() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const monthKey = getMonthKey(currentDate);
  const [data, setData] = useState<MonthData>(() => loadMonth(monthKey));
  const [customCategories, setCustomCategories] = useState<string[]>(loadCustomCategories);

  useEffect(() => {
    setData(loadMonth(monthKey));
  }, [monthKey]);

  const persist = useCallback((newData: MonthData) => {
    setData(newData);
    saveMonth(monthKey, newData);
  }, [monthKey]);

  const addExpense = useCallback((expense: Omit<Expense, "id">) => {
    const newExpense: Expense = { ...expense, id: crypto.randomUUID() };
    const newData = { ...data, expenses: [...data.expenses, newExpense] };
    persist(newData);
  }, [data, persist]);

  const updateExpense = useCallback((id: string, updates: Partial<Omit<Expense, "id">>) => {
    const newData = {
      ...data,
      expenses: data.expenses.map(e => e.id === id ? { ...e, ...updates } : e),
    };
    persist(newData);
  }, [data, persist]);

  const deleteExpense = useCallback((id: string) => {
    const newData = { ...data, expenses: data.expenses.filter(e => e.id !== id) };
    persist(newData);
  }, [data, persist]);

  const setBudget = useCallback((budget: Budget) => {
    persist({ ...data, budget });
  }, [data, persist]);

  const addCustomCategory = useCallback((cat: string) => {
    if (!customCategories.includes(cat)) {
      const updated = [...customCategories, cat];
      setCustomCategories(updated);
      saveCustomCategories(updated);
    }
  }, [customCategories]);

  const navigateMonth = useCallback((offset: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + offset);
      return d;
    });
  }, []);

  const goToMonth = useCallback((year: number, month: number) => {
    setCurrentDate(new Date(year, month));
  }, []);

  // Load previous month data for comparison
  const prevMonthKey = getMonthKey(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const prevMonthData = loadMonth(prevMonthKey);

  return {
    currentDate,
    monthKey,
    expenses: data.expenses,
    budget: data.budget,
    prevMonthExpenses: prevMonthData.expenses,
    customCategories,
    addExpense,
    updateExpense,
    deleteExpense,
    setBudget,
    addCustomCategory,
    navigateMonth,
    goToMonth,
  };
}
