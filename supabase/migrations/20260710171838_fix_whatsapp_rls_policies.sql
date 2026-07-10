-- Drop ALL existing policies on contacts, conversations, messages, whatsapp_instances
-- to eliminate conflicting permissive policies from earlier migrations

DROP POLICY IF EXISTS "contacts_all" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;

DROP POLICY IF EXISTS "conversations_all" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete" ON public.conversations;

DROP POLICY IF EXISTS "messages_all" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;

DROP POLICY IF EXISTS "whatsapp_instances_all" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;

-- whatsapp_instances: restrict to own user_id
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- contacts: restrict to instances owned by the authenticated user
CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  ) WITH CHECK (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );

-- conversations: restrict to instances owned by the authenticated user
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "conversations_update" ON public.conversations
  FOR UPDATE TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  ) WITH CHECK (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "conversations_delete" ON public.conversations
  FOR DELETE TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );

-- messages: restrict to conversations -> instances owned by the authenticated user
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE instance_id IN (
        SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE instance_id IN (
        SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE TO authenticated USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE instance_id IN (
        SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()
      )
    )
  ) WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE instance_id IN (
        SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE TO authenticated USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE instance_id IN (
        SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()
      )
    )
  );

-- Ensure seed user exists with linked config and instance
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brsolutiontransport@gmail.com') THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'brsolutiontransport@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "BR Solution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = 'brsolutiontransport@gmail.com';

  INSERT INTO public.users (id, email, name, role)
  VALUES (v_user_id, 'brsolutiontransport@gmail.com', 'BR Solution', 'admin')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.configuracoes_whatsapp (user_id, phone_number_id, waba_id, access_token)
  VALUES (v_user_id, '106540000000000', '100000000000000', 'EAABplaceholderReplaceWithRealToken')
  ON CONFLICT (phone_number_id) DO NOTHING;

  INSERT INTO public.whatsapp_instances (user_id, instance_name, instance_token, server_url, status, phone)
  VALUES (v_user_id, 'meta_106540000000000', 'meta_cloud_api', 'https://graph.facebook.com', 'connected', '+5511999999999')
  ON CONFLICT (instance_name) DO NOTHING;
END $$;
