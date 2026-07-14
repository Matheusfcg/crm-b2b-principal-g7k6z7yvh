-- Drop legacy columns from whatsapp_instances
ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS instance_name;
ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS server_url;
ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS qrcode;
ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS last_connection;
ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS last_error;
ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS connected;

-- Drop legacy constraints/indexes
ALTER TABLE public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_instance_name_key;
DROP INDEX IF EXISTS whatsapp_instances_instance_name_key;

-- Ensure required columns exist
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'z-api';
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_id TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_token TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS client_token TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS webhook_token TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected';
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- CHECK constraint on status
ALTER TABLE public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_status_check;
ALTER TABLE public.whatsapp_instances
  ADD CONSTRAINT whatsapp_instances_status_check
  CHECK (status IN ('connected', 'disconnected', 'connecting'));

-- Unique index: one Z-API instance per user
DROP INDEX IF EXISTS whatsapp_instances_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_user_id_key ON public.whatsapp_instances (user_id);

-- Enable RLS
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- RLS policies (idempotent)
DROP POLICY IF EXISTS "whatsapp_instances_all" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;

CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Ensure realtime is enabled
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
