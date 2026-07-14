-- Securely cleanup and enforce Z-API schema
DO $BLOCK$
BEGIN
  -- Delete existing records as they belong to legacy integrations
  DELETE FROM public.whatsapp_instances;
  
  -- Drop legacy columns safely
  BEGIN
    ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS instance_name;
    ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS server_url;
    ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS qrcode;
    ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS last_connection;
    ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS last_error;
    ALTER TABLE public.whatsapp_instances DROP COLUMN IF EXISTS connected;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Drop legacy constraints
  BEGIN
    ALTER TABLE public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_instance_name_key;
    DROP INDEX IF EXISTS whatsapp_instances_instance_name_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Add Z-API required columns
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'z-api';
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_id TEXT;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_token TEXT;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS client_token TEXT;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS webhook_token TEXT;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected';
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  -- Replace constraint safely
  ALTER TABLE public.whatsapp_instances DROP CONSTRAINT IF EXISTS whatsapp_instances_status_check;
  ALTER TABLE public.whatsapp_instances
    ADD CONSTRAINT whatsapp_instances_status_check
    CHECK (status IN ('connected', 'disconnected', 'connecting'));

  -- Add unique index for user_id to enforce 1 instance per user
  DROP INDEX IF EXISTS whatsapp_instances_user_id_key;
  CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_user_id_key ON public.whatsapp_instances (user_id);

END $BLOCK$;
