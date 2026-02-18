import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Expense, Budget, RecurringExpense, CreditCard, CreditCardInvoice, InvoiceItem, FinancialAccount, AccountTransfer, AccountAdjustment, AdjustmentReason, Salary, ExtraIncome, getMonthKey } from "@/types/expense";
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
   const [historyData, setHistoryData] = useState<{ month: string; total: number }[]>([]);

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allBudgets, setAllBudgets] = useState<{ month: number; year: number; total_limit: number }[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [accountTransfers, setAccountTransfers] = useState<AccountTransfer[]>([]);
  const [accountAdjustments, setAccountAdjustments] = useState<AccountAdjustment[]>([]);
  const [salary, setSalary] = useState<Salary | null>(null);
  const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>([]);

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
        (data || []).map((e: any) => ({
          id: e.id,
          date: e.date,
          description: e.description,
          category: e.category,
          amount: Number(e.amount),
          isRecurring: recurringExpenseIds.has(e.id),
          status: e.status || 'paid',
          accountId: e.account_id || undefined,
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
          (data || []).map((e: any) => ({
            id: e.id,
            date: e.date,
            description: e.description,
            category: e.category,
            amount: Number(e.amount),
            status: e.status || 'paid',
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

  // Load 6-month history for chart
  useEffect(() => {
    if (!user) return;
    
    const loadHistory = async () => {
      const history = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
        const endD = new Date(y, m, 1);
        const endDate = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, "0")}-01`;
        
        const { data } = await supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lt("date", endDate);
          
        const total = (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
        const monthLabel = d.toLocaleString('pt-BR', { month: 'short' });
        history.push({ month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), total });
      }
      setHistoryData(history);
    };
    
    loadHistory();
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

  // Load financial accounts
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

  // Load account transfers
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

  // Load account adjustments
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

  // Load salary for current month
  useEffect(() => {
    if (!user) return;
    const loadSalary = async () => {
      // Try current month
      const { data } = await supabase
        .from("salaries" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (data) {
        const d = data as any;
        setSalary({ id: d.id, amount: Number(d.amount), month: d.month, year: d.year, dayOfReceipt: d.day_of_receipt, autoRepeat: d.auto_repeat });
      } else {
        // Check if previous month has auto_repeat enabled
        const prevM = month === 1 ? 12 : month - 1;
        const prevY = month === 1 ? year - 1 : year;
        const { data: prevData } = await supabase
          .from("salaries" as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("month", prevM)
          .eq("year", prevY)
          .eq("auto_repeat", true)
          .maybeSingle();

        if (prevData) {
          const p = prevData as any;
          // Auto-create for current month
          const { data: newSalary } = await supabase
            .from("salaries" as any)
            .insert({ user_id: user.id, amount: p.amount, month, year, day_of_receipt: p.day_of_receipt, auto_repeat: true } as any)
            .select()
            .single();
          if (newSalary) {
            const n = newSalary as any;
            setSalary({ id: n.id, amount: Number(n.amount), month: n.month, year: n.year, dayOfReceipt: n.day_of_receipt, autoRepeat: n.auto_repeat });
          } else {
            setSalary(null);
          }
        } else {
          setSalary(null);
        }
      }
    };
    loadSalary();
  }, [user, month, year]);

  // Load extra incomes for current month
  useEffect(() => {
    if (!user) return;
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

    supabase
      .from("extra_incomes" as any)
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lt("date", endDate)
      .order("date", { ascending: false })
      .then(({ data }: any) => {
        setExtraIncomes((data || []).map((e: any) => ({
          id: e.id, amount: Number(e.amount), description: e.description, category: e.category, date: e.date,
        })));
      });
  }, [user, month, year]);

  // Load all expenses, budgets, salaries and extra incomes for cumulative balance
  const [allSalaries, setAllSalaries] = useState<{ month: number; year: number; amount: number }[]>([]);
  const [allExtraIncomes, setAllExtraIncomes] = useState<{ date: string; amount: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    const loadAll = async () => {
      const { data: expData } = await supabase
        .from("expenses")
        .select("id, date, amount")
        .eq("user_id", user.id);
      setAllExpenses((expData || []).map((e: any) => ({ id: e.id, date: e.date, description: "", category: "", amount: Number(e.amount), status: e.status || 'paid' as const })));

      const { data: budData } = await supabase
        .from("budgets")
        .select("month, year, total_limit")
        .eq("user_id", user.id);
      setAllBudgets((budData || []).map(b => ({ month: b.month, year: b.year, total_limit: Number(b.total_limit) })));

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
  }, [user, expenses, budget, salary, extraIncomes]);

  // Calculate cumulative balance
  const monthBalance = useMemo((): MonthBalance => {
    const mk = getMonthKey(currentDate);
    
    const allMonthKeys = new Set<string>();
    allExpenses.forEach(e => {
      const d = new Date(e.date);
      allMonthKeys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    allBudgets.forEach(b => {
      allMonthKeys.add(`${b.year}-${String(b.month).padStart(2, "0")}`);
    });
    allSalaries.forEach(s => {
      allMonthKeys.add(`${s.year}-${String(s.month).padStart(2, "0")}`);
    });
    allExtraIncomes.forEach(e => {
      const d = new Date(e.date);
      allMonthKeys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    allMonthKeys.add(mk);

    const sortedKeys = Array.from(allMonthKeys).sort();
    
    let carryOver = 0;
    let result: MonthBalance = { monthKey: mk, income: 0, expenses: 0, paidInvoices: 0, carryOver: 0, balance: 0 };

    for (const key of sortedKeys) {
      const [y, m] = key.split("-").map(Number);
      
      // Income = salary + budget (legacy) + extra incomes
      const salaryIncome = allSalaries.find(s => s.month === m && s.year === y)?.amount || 0;
      const budgetIncome = allBudgets.find(b => b.month === m && b.year === y)?.total_limit || 0;
      const extraIncome = allExtraIncomes
        .filter(e => { const d = new Date(e.date); return d.getFullYear() === y && d.getMonth() + 1 === m; })
        .reduce((s, e) => s + e.amount, 0);
      const monthIncome = salaryIncome + extraIncome + budgetIncome;

      const monthExpenses = allExpenses
        .filter(e => {
          const d = new Date(e.date);
          return d.getFullYear() === y && d.getMonth() + 1 === m;
        })
        .reduce((s, e) => s + e.amount, 0);
      
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
  }, [allExpenses, allBudgets, allSalaries, allExtraIncomes, invoices, currentDate]);

  const addExpense = useCallback(
    async (expense: Omit<Expense, "id">) => {
      if (!user) return;
      const insertData: any = {
          user_id: user.id,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          status: expense.status || 'paid',
        };
      if (expense.accountId) insertData.account_id = expense.accountId;
      const { data, error } = await supabase
        .from("expenses")
        .insert(insertData)
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
            status: (data as any).status || 'paid',
            accountId: (data as any).account_id || undefined,
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
              status: (expense as any).status || 'paid',
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
        return [...prev, { id: crypto.randomUUID(), cardId, month, items: [newItem], isPaid: false }];
      }
    });
  }, []);

  const addInstallments = useCallback((cardId: string, items: { month: string; item: Omit<InvoiceItem, "id"> }[]) => {
    setInvoices(prev => {
      let updated = [...prev];
      for (const { month, item } of items) {
        const newItem: InvoiceItem = { ...item, id: crypto.randomUUID() };
        const existingIdx = updated.findIndex(i => i.cardId === cardId && i.month === month);
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
    setInvoices(prev =>
      prev.map(inv => {
        if (inv.cardId !== cardId) return inv;
        return { ...inv, items: inv.items.filter(i => i.installmentGroupId !== groupId) };
      }).filter(inv => inv.items.length > 0 || inv.isPaid)
    );
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

  // Financial account CRUD
  const addFinancialAccount = useCallback(async (account: Omit<FinancialAccount, "id" | "isActive">) => {
    if (!user) return;
    const insertData: any = {
      user_id: user.id,
      name: account.name,
      type: account.type,
      balance: account.balance,
      color: account.color,
      icon: account.icon,
    };
    if (account.appliedValue) insertData.applied_value = account.appliedValue;
    if (account.currentValue) insertData.current_value = account.currentValue;

    const { data, error } = await supabase
      .from("financial_accounts" as any)
      .insert(insertData as any)
      .select()
      .single();

    if (data && !error) {
      const d = data as any;
      setFinancialAccounts(prev => [...prev, {
        id: d.id, name: d.name, type: d.type, balance: Number(d.balance),
        color: d.color, icon: d.icon, isActive: d.is_active,
        appliedValue: Number(d.applied_value || 0), currentValue: Number(d.current_value || 0),
      }]);
    }
  }, [user]);

  const updateFinancialAccount = useCallback(async (id: string, updates: Partial<FinancialAccount>) => {
    if (!user) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.icon !== undefined) dbUpdates.icon = updates.icon;
    if (updates.appliedValue !== undefined) dbUpdates.applied_value = updates.appliedValue;
    if (updates.currentValue !== undefined) dbUpdates.current_value = updates.currentValue;

    const { error } = await supabase
      .from("financial_accounts" as any)
      .update(dbUpdates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      setFinancialAccounts(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    }
  }, [user]);

  const deleteFinancialAccount = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("financial_accounts" as any)
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (!error) {
      setFinancialAccounts(prev => prev.filter(a => a.id !== id));
    }
  }, [user]);

  const transferBetweenAccounts = useCallback(async (fromId: string, toId: string, amount: number, description?: string) => {
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
      setAccountTransfers(prev => [{
        id: t.id, fromAccountId: t.from_account_id, toAccountId: t.to_account_id,
        amount: Number(t.amount), description: t.description, date: t.date,
      }, ...prev]);
    }
  }, [user]);

  // Account adjustment
  const addAccountAdjustment = useCallback(async (accountId: string, amount: number, reason: AdjustmentReason, description?: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("account_adjustments" as any)
      .insert({ account_id: accountId, user_id: user.id, amount, reason, description } as any)
      .select()
      .single();

    if (data && !error) {
      const a = data as any;
      setAccountAdjustments(prev => [{
        id: a.id, accountId: a.account_id, amount: Number(a.amount),
        reason: a.reason, description: a.description, date: a.date,
      }, ...prev]);
    }
  }, [user]);

  const deleteAccountAdjustment = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("account_adjustments" as any)
      .delete()
      .eq("id", id);
    if (!error) setAccountAdjustments(prev => prev.filter(a => a.id !== id));
  }, [user]);

  // Archive/unarchive account
  const toggleAccountArchive = useCallback(async (id: string, isActive: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from("financial_accounts" as any)
      .update({ is_active: isActive } as any)
      .eq("id", id)
      .eq("user_id", user.id);
    if (!error) {
      setFinancialAccounts(prev => prev.map(a => a.id === id ? { ...a, isActive } : a));
    }
  }, [user]);

  // Salary CRUD
  const saveSalary = useCallback(async (amount: number, dayOfReceipt: number, autoRepeat: boolean) => {
    if (!user) return;
    const insertData: any = { user_id: user.id, amount, month, year, day_of_receipt: dayOfReceipt, auto_repeat: autoRepeat };

    if (salary) {
      const { error } = await supabase
        .from("salaries" as any)
        .update({ amount, day_of_receipt: dayOfReceipt, auto_repeat: autoRepeat } as any)
        .eq("id", salary.id);
      if (!error) setSalary({ ...salary, amount, dayOfReceipt, autoRepeat });
    } else {
      const { data, error } = await supabase
        .from("salaries" as any)
        .insert(insertData as any)
        .select()
        .single();
      if (data && !error) {
        const d = data as any;
        setSalary({ id: d.id, amount: Number(d.amount), month: d.month, year: d.year, dayOfReceipt: d.day_of_receipt, autoRepeat: d.auto_repeat });
      }
    }
  }, [user, month, year, salary]);

  const deleteSalary = useCallback(async () => {
    if (!user || !salary) return;
    const { error } = await supabase
      .from("salaries" as any)
      .delete()
      .eq("id", salary.id);
    if (!error) setSalary(null);
  }, [user, salary]);

  // Extra Income CRUD
  const addExtraIncome = useCallback(async (income: Omit<ExtraIncome, "id">) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("extra_incomes" as any)
      .insert({ user_id: user.id, amount: income.amount, description: income.description, category: income.category, date: income.date } as any)
      .select()
      .single();
    if (data && !error) {
      const d = data as any;
      setExtraIncomes(prev => [{ id: d.id, amount: Number(d.amount), description: d.description, category: d.category, date: d.date }, ...prev]);
    }
  }, [user]);

  const updateExtraIncome = useCallback(async (id: string, updates: Partial<Omit<ExtraIncome, "id">>) => {
    if (!user) return;
    const { error } = await supabase
      .from("extra_incomes" as any)
      .update(updates as any)
      .eq("id", id);
    if (!error) {
      setExtraIncomes(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    }
  }, [user]);

  const deleteExtraIncome = useCallback(async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("extra_incomes" as any)
      .delete()
      .eq("id", id);
    if (!error) {
      setExtraIncomes(prev => prev.filter(e => e.id !== id));
    }
  }, [user]);

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

    // do feat/financial-calendar
    historyData,

    // do main
    monthBalance,
    financialAccounts,
    accountTransfers,
    accountAdjustments,
    salary,
    extraIncomes,

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