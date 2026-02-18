
-- Table for fixed monthly salary
CREATE TABLE public.salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  day_of_receipt INTEGER NOT NULL DEFAULT 5,
  auto_repeat BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE public.salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own salaries" ON public.salaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own salaries" ON public.salaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own salaries" ON public.salaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own salaries" ON public.salaries FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_salaries_updated_at
  BEFORE UPDATE ON public.salaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Table for extra/additional income
CREATE TABLE public.extra_incomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outros',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.extra_incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extra incomes" ON public.extra_incomes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own extra incomes" ON public.extra_incomes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own extra incomes" ON public.extra_incomes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own extra incomes" ON public.extra_incomes FOR DELETE USING (auth.uid() = user_id);
