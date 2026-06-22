-- Ensure RLS is enabled on all whatsapp related tables
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 1. whatsapp_instances
DROP POLICY IF EXISTS "whatsapp_instances_all" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_all" ON public.whatsapp_instances
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 2. whatsapp_logs
DROP POLICY IF EXISTS "whatsapp_logs_all" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_all" ON public.whatsapp_logs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. contacts
DROP POLICY IF EXISTS "contacts_all" ON public.contacts;
CREATE POLICY "contacts_all" ON public.contacts
  FOR ALL TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  ) WITH CHECK (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );

-- 4. conversations
DROP POLICY IF EXISTS "conversations_all" ON public.conversations;
CREATE POLICY "conversations_all" ON public.conversations
  FOR ALL TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  ) WITH CHECK (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );

-- 5. messages
DROP POLICY IF EXISTS "messages_all" ON public.messages;
CREATE POLICY "messages_all" ON public.messages
  FOR ALL TO authenticated USING (
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
