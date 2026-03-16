
-- Shared expenses: tracks which expenses are shared in a family group
CREATE TABLE public.shared_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  split_type text NOT NULL DEFAULT 'proportional', -- 'proportional' or 'equal'
  splits jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{user_id, percentage, amount}]
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(expense_id)
);

ALTER TABLE public.shared_expenses ENABLE ROW LEVEL SECURITY;

-- Members of the group can view shared expenses
CREATE POLICY "Group members can view shared expenses"
  ON public.shared_expenses FOR SELECT TO authenticated
  USING (is_family_member(auth.uid(), group_id));

-- Creator can insert shared expenses
CREATE POLICY "Creator can insert shared expenses"
  ON public.shared_expenses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Creator can update shared expenses
CREATE POLICY "Creator can update shared expenses"
  ON public.shared_expenses FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- Creator can delete shared expenses
CREATE POLICY "Creator can delete shared expenses"
  ON public.shared_expenses FOR DELETE TO authenticated
  USING (created_by = auth.uid());
