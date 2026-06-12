-- Fix RLS Policies for whatsapp_instances, contacts, conversations, messages

-- Users table
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);

-- WhatsApp Instances RLS
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Contacts RLS
DROP POLICY IF EXISTS "Contacts_select" ON public.contacts;
CREATE POLICY "Contacts_select" ON public.contacts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = contacts.instance_id AND wi.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Contacts_insert" ON public.contacts;
CREATE POLICY "Contacts_insert" ON public.contacts FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = contacts.instance_id AND wi.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Contacts_update" ON public.contacts;
CREATE POLICY "Contacts_update" ON public.contacts FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = contacts.instance_id AND wi.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Contacts_delete" ON public.contacts;
CREATE POLICY "Contacts_delete" ON public.contacts FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = contacts.instance_id AND wi.user_id = auth.uid())
);

-- Conversations RLS
DROP POLICY IF EXISTS "Conversations_select" ON public.conversations;
CREATE POLICY "Conversations_select" ON public.conversations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = conversations.instance_id AND wi.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Conversations_insert" ON public.conversations;
CREATE POLICY "Conversations_insert" ON public.conversations FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = conversations.instance_id AND wi.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Conversations_update" ON public.conversations;
CREATE POLICY "Conversations_update" ON public.conversations FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = conversations.instance_id AND wi.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Conversations_delete" ON public.conversations;
CREATE POLICY "Conversations_delete" ON public.conversations FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = conversations.instance_id AND wi.user_id = auth.uid())
);

-- Messages RLS
DROP POLICY IF EXISTS "Messages_select" ON public.messages;
CREATE POLICY "Messages_select" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.whatsapp_instances wi ON wi.id = c.instance_id
    WHERE c.id = messages.conversation_id AND wi.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Messages_insert" ON public.messages;
CREATE POLICY "Messages_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.whatsapp_instances wi ON wi.id = c.instance_id
    WHERE c.id = messages.conversation_id AND wi.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Messages_update" ON public.messages;
CREATE POLICY "Messages_update" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.whatsapp_instances wi ON wi.id = c.instance_id
    WHERE c.id = messages.conversation_id AND wi.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Messages_delete" ON public.messages;
CREATE POLICY "Messages_delete" ON public.messages FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    JOIN public.whatsapp_instances wi ON wi.id = c.instance_id
    WHERE c.id = messages.conversation_id AND wi.user_id = auth.uid()
  )
);

-- Seed Data for brsolutiontransport@gmail.com
DO $$
DECLARE
  new_user_id uuid := '20000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brsolutiontransport@gmail.com') THEN
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
      crypt('Skip@Pass123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "BR Solution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, name, role)
    VALUES (new_user_id, 'brsolutiontransport@gmail.com', 'BR Solution', 'admin')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.whatsapp_instances (
      user_id, instance_name, status, instance_token, server_url
    ) VALUES (
      new_user_id, 'brsolution_instance', 'disconnected', 'brsolution_token', 'https://apiwhatsvexaview.uazapi.com'
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
