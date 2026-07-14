ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_logs_all" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_select" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_insert" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_update" ON public.whatsapp_logs;
DROP POLICY IF EXISTS "whatsapp_logs_delete" ON public.whatsapp_logs;

CREATE POLICY "whatsapp_logs_select" ON public.whatsapp_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "whatsapp_logs_insert" ON public.whatsapp_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "whatsapp_logs_update" ON public.whatsapp_logs
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "whatsapp_logs_delete" ON public.whatsapp_logs
  FOR DELETE TO authenticated USING (user_id = auth.uid());
