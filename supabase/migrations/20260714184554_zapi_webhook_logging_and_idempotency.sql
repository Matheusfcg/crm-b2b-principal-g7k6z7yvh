-- Ensure unique constraint on whatsapp_messages.message_id for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_messages_message_id_key'
  ) THEN
    -- Remove duplicates before creating unique constraint
    DELETE FROM public.whatsapp_messages a
    USING public.whatsapp_messages b
    WHERE a.id < b.id AND a.message_id IS NOT NULL AND a.message_id = b.message_id;
    
    CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_message_id_key
      ON public.whatsapp_messages (message_id);
  END IF;
END $$;

-- Ensure RLS policies on interactions (idempotent)
DROP POLICY IF EXISTS "interactions_select" ON public.interactions;
CREATE POLICY "interactions_select" ON public.interactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "interactions_insert" ON public.interactions;
CREATE POLICY "interactions_insert" ON public.interactions
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "interactions_update" ON public.interactions;
CREATE POLICY "interactions_update" ON public.interactions
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "interactions_delete" ON public.interactions;
CREATE POLICY "interactions_delete" ON public.interactions
  FOR DELETE TO authenticated USING (true);

-- Ensure RLS policies on whatsapp_logs (idempotent)
DROP POLICY IF EXISTS "whatsapp_logs_select" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_select" ON public.whatsapp_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "whatsapp_logs_insert" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_insert" ON public.whatsapp_logs
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "whatsapp_logs_update" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_update" ON public.whatsapp_logs
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "whatsapp_logs_delete" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_delete" ON public.whatsapp_logs
  FOR DELETE TO authenticated USING (true);

-- Ensure seed user exists (idempotent)
DO $$
DECLARE
  seed_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brsolutiontransport@gmail.com') THEN
    seed_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      seed_user_id,
      '00000000-0000-0000-0000-000000000000',
      'brsolutiontransport@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "BR Solution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, name, role)
    VALUES (seed_user_id, 'brsolutiontransport@gmail.com', 'BR Solution', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Add index on leads.telefone for faster phone-based lookups during interaction sync
CREATE INDEX IF NOT EXISTS idx_leads_telefone ON public.leads (telefone);
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_external_id ON public.leads (whatsapp_external_id);
