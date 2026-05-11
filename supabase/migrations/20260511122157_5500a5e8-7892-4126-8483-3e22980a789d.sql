
-- Tabela de conexões com a Pluggy (uma por banco conectado)
CREATE TABLE public.pluggy_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pluggy_item_id TEXT NOT NULL,
  connector_id INTEGER,
  connector_name TEXT NOT NULL,
  connector_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'UPDATING',
  status_detail TEXT,
  mfa_required BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, pluggy_item_id)
);

CREATE INDEX idx_pluggy_connections_user ON public.pluggy_connections(user_id);
CREATE INDEX idx_pluggy_connections_item ON public.pluggy_connections(pluggy_item_id);

ALTER TABLE public.pluggy_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pluggy connections"
  ON public.pluggy_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pluggy connections"
  ON public.pluggy_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pluggy connections"
  ON public.pluggy_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pluggy connections"
  ON public.pluggy_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_pluggy_connections_updated_at
  BEFORE UPDATE ON public.pluggy_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de mapeamento entre contas Pluggy e contas financeiras locais
CREATE TABLE public.pluggy_account_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.pluggy_connections(id) ON DELETE CASCADE,
  pluggy_account_id TEXT NOT NULL,
  financial_account_id UUID,
  account_type TEXT NOT NULL,
  account_subtype TEXT,
  account_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, pluggy_account_id)
);

CREATE INDEX idx_pluggy_account_links_user ON public.pluggy_account_links(user_id);
CREATE INDEX idx_pluggy_account_links_connection ON public.pluggy_account_links(connection_id);

ALTER TABLE public.pluggy_account_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pluggy account links"
  ON public.pluggy_account_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pluggy account links"
  ON public.pluggy_account_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pluggy account links"
  ON public.pluggy_account_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pluggy account links"
  ON public.pluggy_account_links FOR DELETE
  USING (auth.uid() = user_id);

-- Campos de deduplicação em expenses
ALTER TABLE public.expenses
  ADD COLUMN pluggy_transaction_id TEXT,
  ADD COLUMN auto_imported BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_expenses_pluggy_tx
  ON public.expenses(user_id, pluggy_transaction_id)
  WHERE pluggy_transaction_id IS NOT NULL;

-- Campos de deduplicação em extra_incomes
ALTER TABLE public.extra_incomes
  ADD COLUMN pluggy_transaction_id TEXT,
  ADD COLUMN auto_imported BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_extra_incomes_pluggy_tx
  ON public.extra_incomes(user_id, pluggy_transaction_id)
  WHERE pluggy_transaction_id IS NOT NULL;

-- Limite de conexões por plano
ALTER TABLE public.profiles
  ADD COLUMN pluggy_connections_limit INTEGER NOT NULL DEFAULT 1;
