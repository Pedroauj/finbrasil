
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS fin_score integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS referral_code text DEFAULT NULL;

-- Generate referral codes for existing profiles
UPDATE public.profiles
SET referral_code = substr(md5(random()::text), 1, 8)
WHERE referral_code IS NULL;
