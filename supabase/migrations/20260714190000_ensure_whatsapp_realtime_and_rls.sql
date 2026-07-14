-- Ensure realtime publication includes whatsapp_messages
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Ensure RLS policies on whatsapp_messages (idempotent)
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_messages_select" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_select" ON public.whatsapp_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_messages_insert" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_insert" ON public.whatsapp_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_messages_update" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_update" ON public.whatsapp_messages
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_messages_delete" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_delete" ON public.whatsapp_messages
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Ensure RLS policies on whatsapp_logs (idempotent)
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

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
