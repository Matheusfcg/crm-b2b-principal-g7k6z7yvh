DO $$
BEGIN
  -- Update any lingering references to api.goskip.dev in the whatsapp_instances table
  UPDATE public.whatsapp_instances
  SET server_url = 'https://api.uazapi.com'
  WHERE server_url LIKE '%api.goskip.dev%';
END $$;
