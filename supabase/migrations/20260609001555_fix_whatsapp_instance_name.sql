DO $$
BEGIN
  -- Update any whatsapp_instances that have a UUID as instance_name
  -- This ensures the system regenerates them with a proper Uazapi name instead of passing 36-char IDs
  UPDATE public.whatsapp_instances
  SET instance_name = 'user_' || REPLACE(user_id::text, '-', '')
  WHERE instance_name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
END $$;
