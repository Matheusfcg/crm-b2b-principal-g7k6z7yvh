DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'disconnected',
    qrcode TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_connection TIMESTAMPTZ
  );

  CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
    remote_jid TEXT NOT NULL,
    push_name TEXT,
    profile_picture TEXT,
    UNIQUE(instance_id, remote_jid)
  );

  CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    last_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(instance_id, contact_id)
  );

  CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    from_me BOOLEAN DEFAULT false,
    content TEXT,
    type TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );
END $$;

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- whatsapp_instances policies
DROP POLICY IF EXISTS "Instances_select" ON public.whatsapp_instances;
CREATE POLICY "Instances_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "Instances_insert" ON public.whatsapp_instances;
CREATE POLICY "Instances_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Instances_update" ON public.whatsapp_instances;
CREATE POLICY "Instances_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "Instances_delete" ON public.whatsapp_instances;
CREATE POLICY "Instances_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- contacts policies
DROP POLICY IF EXISTS "Contacts_select" ON public.contacts;
CREATE POLICY "Contacts_select" ON public.contacts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = instance_id AND (wi.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')))
  );

DROP POLICY IF EXISTS "Contacts_insert" ON public.contacts;
CREATE POLICY "Contacts_insert" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = instance_id AND wi.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Contacts_update" ON public.contacts;
CREATE POLICY "Contacts_update" ON public.contacts
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = instance_id AND wi.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Contacts_delete" ON public.contacts;
CREATE POLICY "Contacts_delete" ON public.contacts
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = instance_id AND wi.user_id = auth.uid())
  );

-- conversations policies
DROP POLICY IF EXISTS "Conversations_select" ON public.conversations;
CREATE POLICY "Conversations_select" ON public.conversations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = instance_id AND (wi.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')))
  );

DROP POLICY IF EXISTS "Conversations_insert" ON public.conversations;
CREATE POLICY "Conversations_insert" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = instance_id AND wi.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Conversations_update" ON public.conversations;
CREATE POLICY "Conversations_update" ON public.conversations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = instance_id AND wi.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Conversations_delete" ON public.conversations;
CREATE POLICY "Conversations_delete" ON public.conversations
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.whatsapp_instances wi WHERE wi.id = instance_id AND wi.user_id = auth.uid())
  );

-- messages policies
DROP POLICY IF EXISTS "Messages_select" ON public.messages;
CREATE POLICY "Messages_select" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      JOIN public.whatsapp_instances wi ON wi.id = c.instance_id 
      WHERE c.id = conversation_id AND (wi.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
    )
  );

DROP POLICY IF EXISTS "Messages_insert" ON public.messages;
CREATE POLICY "Messages_insert" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      JOIN public.whatsapp_instances wi ON wi.id = c.instance_id 
      WHERE c.id = conversation_id AND wi.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Messages_update" ON public.messages;
CREATE POLICY "Messages_update" ON public.messages
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      JOIN public.whatsapp_instances wi ON wi.id = c.instance_id 
      WHERE c.id = conversation_id AND wi.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Messages_delete" ON public.messages;
CREATE POLICY "Messages_delete" ON public.messages
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      JOIN public.whatsapp_instances wi ON wi.id = c.instance_id 
      WHERE c.id = conversation_id AND wi.user_id = auth.uid()
    )
  );

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;
