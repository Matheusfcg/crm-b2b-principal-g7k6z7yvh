-- Ensures the server_url and instance_token columns are present on whatsapp_instances table
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS server_url TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_token TEXT;
