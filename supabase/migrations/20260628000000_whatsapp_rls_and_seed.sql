DO $DO_BLOCK$
DECLARE
  new_user_id uuid;
BEGIN
  -- RLS Policies for whatsapp_instances
  ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
  
  DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
  CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
    FOR SELECT TO authenticated USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
  CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

  DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
  CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;
  CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
    FOR DELETE TO authenticated USING (user_id = auth.uid());

  -- RLS Policies for whatsapp_logs
  ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "whatsapp_logs_select" ON public.whatsapp_logs;
  CREATE POLICY "whatsapp_logs_select" ON public.whatsapp_logs
    FOR SELECT TO authenticated USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "whatsapp_logs_insert" ON public.whatsapp_logs;
  CREATE POLICY "whatsapp_logs_insert" ON public.whatsapp_logs
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

  -- Seed Initial User
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brsolutiontransport@gmail.com') THEN
    new_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'brsolutiontransport@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "BR Solution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, name, role)
    VALUES (new_user_id, 'brsolutiontransport@gmail.com', 'BR Solution', 'admin')
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.whatsapp_instances (user_id, instance_name, server_url, status)
    VALUES (new_user_id, 'inst_' || replace(gen_random_uuid()::text, '-', ''), 'https://api.uazapi.com', 'disconnected')
    ON CONFLICT DO NOTHING;
  END IF;
END $DO_BLOCK$;
