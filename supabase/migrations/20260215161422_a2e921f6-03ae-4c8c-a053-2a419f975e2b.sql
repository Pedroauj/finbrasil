
-- Account adjustments table for balance reconciliation
CREATE TABLE public.account_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.financial_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL DEFAULT 'manual',
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.account_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adjustments" ON public.account_adjustments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own adjustments" ON public.account_adjustments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own adjustments" ON public.account_adjustments FOR DELETE USING (auth.uid() = user_id);

-- Add investment fields to financial_accounts
ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS applied_value NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS current_value NUMERIC NOT NULL DEFAULT 0;
