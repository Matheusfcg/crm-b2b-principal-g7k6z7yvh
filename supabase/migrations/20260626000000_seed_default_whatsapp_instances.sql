DO $$
DECLARE
  u RECORD;
  new_inst_name TEXT;
BEGIN
  FOR u IN SELECT id FROM auth.users
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.whatsapp_instances WHERE user_id = u.id) THEN
      new_inst_name := 'inst_' || replace(gen_random_uuid()::text, '-', '');
      INSERT INTO public.whatsapp_instances (user_id, instance_name, server_url, status)
      VALUES (u.id, new_inst_name, 'https://api.uazapi.com', 'disconnected')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user_whatsapp()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.whatsapp_instances (user_id, instance_name, server_url, status)
  VALUES (NEW.id, 'inst_' || replace(gen_random_uuid()::text, '-', ''), 'https://api.uazapi.com', 'disconnected')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_whatsapp ON auth.users;
CREATE TRIGGER on_auth_user_created_whatsapp
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_whatsapp();
