-- Add raw_payload to whatsapp_messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS raw_payload JSONB;

-- Add token column (alias, as required by spec)
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS token TEXT;

-- Update status CHECK constraint to allow qrcode_pending
ALTER TABLE public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_status_check;
ALTER TABLE public.whatsapp_instances
  ADD CONSTRAINT whatsapp_instances_status_check
  CHECK (status IN ('connected', 'disconnected', 'connecting', 'qrcode_pending'));

-- Index on whatsapp_instances(instance_id) for webhook lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_instance_id
  ON public.whatsapp_instances (instance_id);

-- Composite index on whatsapp_messages for conversation queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_phone_created
  ON public.whatsapp_messages (user_id, phone, created_at DESC);

-- set_updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on whatsapp_instances
DROP TRIGGER IF EXISTS trg_whatsapp_instances_updated_at ON public.whatsapp_instances;
CREATE TRIGGER trg_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Ensure RLS enabled
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- RLS: whatsapp_instances (idempotent)
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS: whatsapp_messages (idempotent)
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

-- Ensure realtime publications
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
