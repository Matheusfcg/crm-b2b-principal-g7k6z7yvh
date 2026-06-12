DO $$
BEGIN
  -- Ensure persistence columns exist for manual configuration usage
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS server_url text;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_token text;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_name text;
END $$;
