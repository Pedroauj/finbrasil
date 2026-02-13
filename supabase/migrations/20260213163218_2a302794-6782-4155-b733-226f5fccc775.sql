
-- 0. Create helper function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. Enums
CREATE TYPE public.account_type AS ENUM ('checking', 'savings', 'wallet', 'credit_card', 'investment');
CREATE TYPE public.transaction_status AS ENUM ('planned', 'paid', 'overdue');

-- 2. Financial accounts table
CREATE TABLE public.financial_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type public.account_type NOT NULL DEFAULT 'wallet',
  balance NUMERIC NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT NOT NULL DEFAULT 'wallet',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own accounts" ON public.financial_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own accounts" ON public.financial_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own accounts" ON public.financial_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own accounts" ON public.financial_accounts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_financial_accounts_updated_at
  BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Add status and account_id to expenses
ALTER TABLE public.expenses
  ADD COLUMN status public.transaction_status NOT NULL DEFAULT 'paid',
  ADD COLUMN account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL;

-- 4. Migrate existing data
UPDATE public.expenses SET status = CASE WHEN date <= CURRENT_DATE THEN 'paid'::public.transaction_status ELSE 'planned'::public.transaction_status END;

-- 5. Account transfers table
CREATE TABLE public.account_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  to_account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.account_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transfers" ON public.account_transfers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transfers" ON public.account_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transfers" ON public.account_transfers FOR DELETE USING (auth.uid() = user_id);

-- 6. Auto-create wallet for new users
CREATE OR REPLACE FUNCTION public.create_default_account()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.financial_accounts (user_id, name, type, balance, color, icon)
  VALUES (NEW.id, 'Carteira', 'wallet', 0, '#6366f1', 'wallet');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_account
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_default_account();

-- 7. Create wallet for existing users
INSERT INTO public.financial_accounts (user_id, name, type, balance, color, icon)
SELECT id, 'Carteira', 'wallet', 0, '#6366f1', 'wallet'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.financial_accounts fa WHERE fa.user_id = u.id);
