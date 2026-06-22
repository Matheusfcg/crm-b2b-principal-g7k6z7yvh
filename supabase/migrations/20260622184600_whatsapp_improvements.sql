DO $$
DECLARE
  new_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brsolutiontransport@gmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'brsolutiontransport@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin BRSolution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;
END $$;

-- Contacts Policies
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;

CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated USING (true);

-- Conversations Policies
DROP POLICY IF EXISTS "conversations_delete" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;

CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "conversations_update" ON public.conversations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "conversations_delete" ON public.conversations
  FOR DELETE TO authenticated USING (true);
