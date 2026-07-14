ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_id TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_token TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS client_token TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS webhook_token TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS connected BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'z-api';

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

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
