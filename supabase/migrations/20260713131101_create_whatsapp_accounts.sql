CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  display_phone_number TEXT,
  access_token TEXT NOT NULL,
  token_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_accounts_select" ON public.whatsapp_accounts;
CREATE POLICY "whatsapp_accounts_select" ON public.whatsapp_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_accounts_insert" ON public.whatsapp_accounts;
CREATE POLICY "whatsapp_accounts_insert" ON public.whatsapp_accounts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_accounts_update" ON public.whatsapp_accounts;
CREATE POLICY "whatsapp_accounts_update" ON public.whatsapp_accounts
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_accounts_delete" ON public.whatsapp_accounts;
CREATE POLICY "whatsapp_accounts_delete" ON public.whatsapp_accounts
  FOR DELETE TO authenticated USING (user_id = auth.uid());
