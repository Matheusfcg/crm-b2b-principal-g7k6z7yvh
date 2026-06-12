DO $DO_BLOCK$
DECLARE
  new_user_id uuid;
BEGIN
  -- 1. Seed user (idempotent)
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
      '{"name": "BR Solution Transport"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, name, email, role)
    VALUES (new_user_id, 'BR Solution Transport', 'brsolutiontransport@gmail.com', 'admin')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'brsolutiontransport@gmail.com' LIMIT 1;
  END IF;

  -- 2. Seed whatsapp_instances with the required 'teste' instance
  INSERT INTO public.whatsapp_instances (
    user_id, instance_name, instance_token, server_url, status
  ) VALUES (
    new_user_id,
    'teste',
    '8127b6a5-1564-40f3-bba1-a5540d44cd51',
    'https://apiwhatsvexaview.uazapi.com',
    'connecting'
  ) ON CONFLICT (user_id) DO UPDATE
    SET instance_name = 'teste',
        instance_token = '8127b6a5-1564-40f3-bba1-a5540d44cd51',
        server_url = 'https://apiwhatsvexaview.uazapi.com',
        status = 'connecting';

  -- 3. Update existing leads without external ID to point to the 'teste' instance conceptually
  UPDATE public.leads 
  SET whatsapp_external_id = 'teste' 
  WHERE whatsapp_external_id IS NULL OR whatsapp_external_id = '';
  
END $DO_BLOCK$;
