DO $$
BEGIN
  -- RLS for contacts
  DROP POLICY IF EXISTS "Contacts_delete" ON public.contacts;
  CREATE POLICY "Contacts_delete" ON public.contacts
    FOR DELETE TO authenticated
    USING (EXISTS ( SELECT 1 FROM whatsapp_instances wi WHERE wi.id = contacts.instance_id AND wi.user_id = auth.uid() ));

  DROP POLICY IF EXISTS "Contacts_insert" ON public.contacts;
  CREATE POLICY "Contacts_insert" ON public.contacts
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS ( SELECT 1 FROM whatsapp_instances wi WHERE wi.id = contacts.instance_id AND wi.user_id = auth.uid() ));

  DROP POLICY IF EXISTS "Contacts_select" ON public.contacts;
  CREATE POLICY "Contacts_select" ON public.contacts
    FOR SELECT TO authenticated
    USING (EXISTS ( SELECT 1 FROM whatsapp_instances wi WHERE wi.id = contacts.instance_id AND (wi.user_id = auth.uid() OR EXISTS ( SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' ))));

  DROP POLICY IF EXISTS "Contacts_update" ON public.contacts;
  CREATE POLICY "Contacts_update" ON public.contacts
    FOR UPDATE TO authenticated
    USING (EXISTS ( SELECT 1 FROM whatsapp_instances wi WHERE wi.id = contacts.instance_id AND wi.user_id = auth.uid() ));

  -- RLS for conversations
  DROP POLICY IF EXISTS "Conversations_delete" ON public.conversations;
  CREATE POLICY "Conversations_delete" ON public.conversations
    FOR DELETE TO authenticated
    USING (EXISTS ( SELECT 1 FROM whatsapp_instances wi WHERE wi.id = conversations.instance_id AND wi.user_id = auth.uid() ));

  DROP POLICY IF EXISTS "Conversations_insert" ON public.conversations;
  CREATE POLICY "Conversations_insert" ON public.conversations
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS ( SELECT 1 FROM whatsapp_instances wi WHERE wi.id = conversations.instance_id AND wi.user_id = auth.uid() ));

  DROP POLICY IF EXISTS "Conversations_select" ON public.conversations;
  CREATE POLICY "Conversations_select" ON public.conversations
    FOR SELECT TO authenticated
    USING (EXISTS ( SELECT 1 FROM whatsapp_instances wi WHERE wi.id = conversations.instance_id AND (wi.user_id = auth.uid() OR EXISTS ( SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' ))));

  DROP POLICY IF EXISTS "Conversations_update" ON public.conversations;
  CREATE POLICY "Conversations_update" ON public.conversations
    FOR UPDATE TO authenticated
    USING (EXISTS ( SELECT 1 FROM whatsapp_instances wi WHERE wi.id = conversations.instance_id AND wi.user_id = auth.uid() ));

  -- RLS for messages
  DROP POLICY IF EXISTS "Messages_delete" ON public.messages;
  CREATE POLICY "Messages_delete" ON public.messages
    FOR DELETE TO authenticated
    USING (EXISTS ( SELECT 1 FROM conversations c JOIN whatsapp_instances wi ON wi.id = c.instance_id WHERE c.id = messages.conversation_id AND wi.user_id = auth.uid() ));

  DROP POLICY IF EXISTS "Messages_insert" ON public.messages;
  CREATE POLICY "Messages_insert" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (EXISTS ( SELECT 1 FROM conversations c JOIN whatsapp_instances wi ON wi.id = c.instance_id WHERE c.id = messages.conversation_id AND wi.user_id = auth.uid() ));

  DROP POLICY IF EXISTS "Messages_select" ON public.messages;
  CREATE POLICY "Messages_select" ON public.messages
    FOR SELECT TO authenticated
    USING (EXISTS ( SELECT 1 FROM conversations c JOIN whatsapp_instances wi ON wi.id = c.instance_id WHERE c.id = messages.conversation_id AND (wi.user_id = auth.uid() OR EXISTS ( SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin' ))));

  DROP POLICY IF EXISTS "Messages_update" ON public.messages;
  CREATE POLICY "Messages_update" ON public.messages
    FOR UPDATE TO authenticated
    USING (EXISTS ( SELECT 1 FROM conversations c JOIN whatsapp_instances wi ON wi.id = c.instance_id WHERE c.id = messages.conversation_id AND wi.user_id = auth.uid() ));

END $$;
