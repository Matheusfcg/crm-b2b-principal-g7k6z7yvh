DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_instances_user_id_key'
  ) THEN
    ALTER TABLE public.whatsapp_instances DROP CONSTRAINT whatsapp_instances_user_id_key;
  END IF;
END $$;
