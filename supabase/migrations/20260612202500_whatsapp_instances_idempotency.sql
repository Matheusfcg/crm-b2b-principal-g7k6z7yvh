DO $$
BEGIN
    ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS status text DEFAULT 'disconnected';
    ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS last_connection timestamptz;
    ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_external_id text;
END $$;
