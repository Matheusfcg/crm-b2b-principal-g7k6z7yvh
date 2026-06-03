ALTER TABLE public.whatsapp_instances 
ADD COLUMN IF NOT EXISTS instance_token TEXT,
ADD COLUMN IF NOT EXISTS instance_external_id TEXT;
