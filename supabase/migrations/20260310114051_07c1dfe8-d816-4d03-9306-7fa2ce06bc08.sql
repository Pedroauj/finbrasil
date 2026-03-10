
-- Family groups
CREATE TABLE public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Minha Família',
  owner_id UUID NOT NULL,
  invite_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Family members
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check family membership
CREATE OR REPLACE FUNCTION public.is_family_member(_user_id UUID, _group_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members
    WHERE user_id = _user_id AND group_id = _group_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_owner(_user_id UUID, _group_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_groups
    WHERE id = _group_id AND owner_id = _user_id
  );
$$;

-- RLS for family_groups
CREATE POLICY "Owner can do all on family_groups" ON public.family_groups
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Members can view their group" ON public.family_groups
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), id));

-- RLS for family_members
CREATE POLICY "Group owner can manage members" ON public.family_members
  FOR ALL TO authenticated
  USING (public.is_family_owner(auth.uid(), group_id))
  WITH CHECK (public.is_family_owner(auth.uid(), group_id));

CREATE POLICY "Members can view group members" ON public.family_members
  FOR SELECT TO authenticated
  USING (public.is_family_member(auth.uid(), group_id));

CREATE POLICY "Users can insert themselves as members" ON public.family_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave group" ON public.family_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Net worth snapshots table for historical tracking
CREATE TABLE public.net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_accounts NUMERIC NOT NULL DEFAULT 0,
  total_investments NUMERIC NOT NULL DEFAULT 0,
  total_debts NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month, year)
);

ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own snapshots" ON public.net_worth_snapshots
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
