
ALTER TABLE public.expenses 
  ADD COLUMN is_installment boolean NOT NULL DEFAULT false,
  ADD COLUMN installment_count integer DEFAULT NULL,
  ADD COLUMN current_installment integer DEFAULT NULL,
  ADD COLUMN parent_installment_id uuid DEFAULT NULL REFERENCES public.expenses(id) ON DELETE SET NULL;

CREATE INDEX idx_expenses_parent_installment ON public.expenses(parent_installment_id) WHERE parent_installment_id IS NOT NULL;
