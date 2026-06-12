DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'brsolutiontransport@gmail.com' LIMIT 1;
  
  -- If user doesn't exist, create it
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'brsolutiontransport@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin BRSolution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, name, role)
    VALUES (v_user_id, 'brsolutiontransport@gmail.com', 'Admin BRSolution', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Ensure RLS policies are complete and correct for whatsapp_instances
  DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
  CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
    FOR SELECT TO authenticated USING (user_id = auth.uid());

  DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
  CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

  DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
  CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

  DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;
  CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
    FOR DELETE TO authenticated USING (user_id = auth.uid());

  -- Insert/update whatsapp instance seed data
  INSERT INTO public.whatsapp_instances (
    user_id,
    instance_name,
    instance_token,
    server_url,
    phone,
    status,
    last_connection,
    updated_at
  ) VALUES (
    v_user_id,
    'rf082990e59c1b2',
    '8127b6a5-1564-40f3-bba1-a5540d44cd51',
    'https://apiwhatsvexaview.uazapi.com',
    '5511944859278',
    'connected',
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    instance_name = EXCLUDED.instance_name,
    instance_token = EXCLUDED.instance_token,
    server_url = EXCLUDED.server_url,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;

END $$;
