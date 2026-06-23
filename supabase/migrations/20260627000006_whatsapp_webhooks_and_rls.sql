DO $DO_BLOCK$
BEGIN
  -- RLS for contacts
  DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
  CREATE POLICY "contacts_select" ON public.contacts FOR SELECT TO authenticated USING (true);
  
  DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
  CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (true);
  
  DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
  CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE TO authenticated USING (true);

  DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
  CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE TO authenticated USING (true);

  -- RLS for conversations
  DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
  CREATE POLICY "conversations_select" ON public.conversations FOR SELECT TO authenticated USING (true);
  
  DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
  CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (true);
  
  DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
  CREATE POLICY "conversations_update" ON public.conversations FOR UPDATE TO authenticated USING (true);

  DROP POLICY IF EXISTS "conversations_delete" ON public.conversations;
  CREATE POLICY "conversations_delete" ON public.conversations FOR DELETE TO authenticated USING (true);

  -- RLS for messages
  DROP POLICY IF EXISTS "messages_select" ON public.messages;
  CREATE POLICY "messages_select" ON public.messages FOR SELECT TO authenticated USING (true);
  
  DROP POLICY IF EXISTS "messages_insert" ON public.messages;
  CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (true);
  
  DROP POLICY IF EXISTS "messages_update" ON public.messages;
  CREATE POLICY "messages_update" ON public.messages FOR UPDATE TO authenticated USING (true);

  DROP POLICY IF EXISTS "messages_delete" ON public.messages;
  CREATE POLICY "messages_delete" ON public.messages FOR DELETE TO authenticated USING (true);
END $DO_BLOCK$;

DO $DO_BLOCK$
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
      '{"name": "BR Solution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, name, role)
    VALUES (new_user_id, 'brsolutiontransport@gmail.com', 'BR Solution', 'admin')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.whatsapp_instances (user_id, instance_name, server_url, status)
    VALUES (new_user_id, 'inst_' || replace(gen_random_uuid()::text, '-', ''), 'https://api.uazapi.com', 'disconnected')
    ON CONFLICT DO NOTHING;
  END IF;
END $DO_BLOCK$;

-- Add new missing columns to whatsapp_instances if they don't exist
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_token text;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_name text;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS server_url text;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS qrcode text;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS status text DEFAULT 'disconnected'::text;
