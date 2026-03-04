ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_provider text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS subscription_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz DEFAULT NULL;