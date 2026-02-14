
-- Chart of Accounts (BAS 2024)
CREATE TABLE public.airledger_chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- asset, liability, equity, income, expense
  account_category TEXT NOT NULL,
  normal_balance TEXT NOT NULL, -- debit or credit
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.airledger_chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read chart of accounts"
  ON public.airledger_chart_of_accounts FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage chart of accounts"
  ON public.airledger_chart_of_accounts FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Transactions
CREATE TABLE public.airledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_date TEXT NOT NULL,
  description TEXT NOT NULL,
  reference_number TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  transaction_type TEXT NOT NULL DEFAULT 'expense',
  analysis_data JSONB,
  image_url TEXT,
  image_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.airledger_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.airledger_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.airledger_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.airledger_transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.airledger_transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Entries (journal lines)
CREATE TABLE public.airledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.airledger_transactions(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit_amount NUMERIC NOT NULL DEFAULT 0,
  credit_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.airledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entries"
  ON public.airledger_entries FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.airledger_transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own entries"
  ON public.airledger_entries FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.airledger_transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Users can update own entries"
  ON public.airledger_entries FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.airledger_transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own entries"
  ON public.airledger_entries FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.airledger_transactions t WHERE t.id = transaction_id AND t.user_id = auth.uid())
  );

-- Opening balances
CREATE TABLE public.airledger_opening (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  balance_type TEXT NOT NULL DEFAULT 'debit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_code)
);

ALTER TABLE public.airledger_opening ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own opening balances"
  ON public.airledger_opening FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own opening balances"
  ON public.airledger_opening FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own opening balances"
  ON public.airledger_opening FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own opening balances"
  ON public.airledger_opening FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Transaction templates
CREATE TABLE public.airledger_transaction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
  template_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  keywords TEXT[],
  template_entries JSONB NOT NULL DEFAULT '[]',
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.airledger_transaction_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view system templates and own templates"
  ON public.airledger_transaction_templates FOR SELECT
  TO authenticated USING (is_system_template = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON public.airledger_transaction_templates FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own templates, admins can update system"
  ON public.airledger_transaction_templates FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR (is_system_template = true AND public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Users can delete own templates, admins can delete system"
  ON public.airledger_transaction_templates FOR DELETE
  TO authenticated USING (auth.uid() = user_id OR (is_system_template = true AND public.has_role(auth.uid(), 'admin')));

-- Template usage tracking
CREATE TABLE public.airledger_template_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.airledger_transaction_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.airledger_template_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own template usage"
  ON public.airledger_template_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own template usage"
  ON public.airledger_template_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Conversations
CREATE TABLE public.airledger_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Ny konversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.airledger_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON public.airledger_conversations FOR ALL
  TO authenticated USING (auth.uid() = user_id);

-- Messages
CREATE TABLE public.airledger_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.airledger_conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sender TEXT NOT NULL, -- 'user' or 'ai'
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.airledger_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own messages"
  ON public.airledger_messages FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.airledger_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())
  );

-- Usage tracking
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_analyses_used INTEGER NOT NULL DEFAULT 0,
  storage_used_mb NUMERIC NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, month_year)
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON public.usage_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage"
  ON public.usage_tracking FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage"
  ON public.usage_tracking FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Admins can view all users' data for admin panel
CREATE POLICY "Admins can view all transactions"
  ON public.airledger_transactions FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all usage"
  ON public.usage_tracking FOR SELECT
  TO authenticated USING (public.has_role(auth.uid(), 'admin'));
