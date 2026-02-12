
-- Recurring expenses table
CREATE TABLE public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL,
  day_of_month INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recurring" ON public.recurring_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recurring" ON public.recurring_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recurring" ON public.recurring_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recurring" ON public.recurring_expenses FOR DELETE USING (auth.uid() = user_id);

-- Track which recurring expenses were already materialized for a given month
CREATE TABLE public.recurring_expense_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_expense_id UUID NOT NULL REFERENCES public.recurring_expenses(id) ON DELETE CASCADE,
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  UNIQUE(recurring_expense_id, month, year)
);

ALTER TABLE public.recurring_expense_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instances" ON public.recurring_expense_instances FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.recurring_expenses r WHERE r.id = recurring_expense_id AND r.user_id = auth.uid()));
CREATE POLICY "Users can insert own instances" ON public.recurring_expense_instances FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.recurring_expenses r WHERE r.id = recurring_expense_id AND r.user_id = auth.uid()));
