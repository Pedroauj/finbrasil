ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS weekly_snapshot_email boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_snapshot_whatsapp boolean NOT NULL DEFAULT false;