ALTER TABLE public.configuracoes_whatsapp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracoes_whatsapp_select" ON public.configuracoes_whatsapp;
CREATE POLICY "configuracoes_whatsapp_select" ON public.configuracoes_whatsapp
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "configuracoes_whatsapp_insert" ON public.configuracoes_whatsapp;
CREATE POLICY "configuracoes_whatsapp_insert" ON public.configuracoes_whatsapp
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "configuracoes_whatsapp_update" ON public.configuracoes_whatsapp;
CREATE POLICY "configuracoes_whatsapp_update" ON public.configuracoes_whatsapp
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "configuracoes_whatsapp_delete" ON public.configuracoes_whatsapp;
CREATE POLICY "configuracoes_whatsapp_delete" ON public.configuracoes_whatsapp
  FOR DELETE TO authenticated USING (user_id = auth.uid());
