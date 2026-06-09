DO $$
BEGIN
  -- Ensure the required columns exist for Uazapi integration
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_name TEXT;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_external_id TEXT;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_token TEXT;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected';
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS qrcode TEXT;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS last_connection TIMESTAMPTZ;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS phone TEXT;
  
  -- Create index on instance_name for faster lookups
  CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_instance_name ON public.whatsapp_instances(instance_name);
END $$;

-- Ensure whatsapp_logs exists
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT,
  endpoint TEXT,
  payload JSONB,
  response JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for whatsapp_logs
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_logs_insert" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_insert" ON public.whatsapp_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_logs_select" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_select" ON public.whatsapp_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin'));
