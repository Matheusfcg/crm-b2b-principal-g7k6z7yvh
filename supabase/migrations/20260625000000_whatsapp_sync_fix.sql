-- Ensure seed user brsolutiontransport@gmail.com exists safely with empty strings for GoTrue compatibility
DO $DO$
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
END $DO$;

-- Fix any existing bad profile_picture URLs in contacts causing 400/404 image errors
UPDATE public.contacts 
SET profile_picture = NULL 
WHERE profile_picture IS NOT NULL AND profile_picture NOT LIKE 'http%';

-- Re-apply RLS Policies idempotently for contacts, conversations, and messages
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Contacts Policies
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT TO authenticated
  USING (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated
  USING (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()))
  WITH CHECK (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated
  USING (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()));

-- Conversations Policies
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT TO authenticated
  USING (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
CREATE POLICY "conversations_update" ON public.conversations
  FOR UPDATE TO authenticated
  USING (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()))
  WITH CHECK (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "conversations_delete" ON public.conversations;
CREATE POLICY "conversations_delete" ON public.conversations
  FOR DELETE TO authenticated
  USING (instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()));

-- Messages Policies
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_update" ON public.messages;
CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
    )
  );
