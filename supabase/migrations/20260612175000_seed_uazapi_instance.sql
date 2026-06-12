DO $$
DECLARE
  new_user_id uuid;
  instance_uuid uuid := '00000000-0000-0000-0000-00000000cd51'::uuid;
BEGIN
  -- Ensure the user exists idempotently
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
      crypt('Skip@Pass123', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "BR Solution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, name, role)
    VALUES (new_user_id, 'brsolutiontransport@gmail.com', 'BR Solution', 'admin')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  ELSE
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'brsolutiontransport@gmail.com';
  END IF;

  -- Ensure the whatsapp_instance exists for this user with cd51 id
  IF NOT EXISTS (SELECT 1 FROM public.whatsapp_instances WHERE user_id = new_user_id OR id = instance_uuid OR instance_name = 'Uazapi-cd51') THEN
    INSERT INTO public.whatsapp_instances (
      id, user_id, instance_name, instance_external_id, instance_token, server_url, status
    ) VALUES (
      instance_uuid,
      new_user_id,
      'Uazapi-cd51',
      'cd51',
      '87C6F5234AB271B4ED8E65D7B32F1A02',
      'https://apiwhatsvexaview.uazapi.com',
      'disconnected'
    );
  END IF;

END $$;
