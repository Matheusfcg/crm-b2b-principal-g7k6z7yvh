DO $$
DECLARE
  test_user_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brsolutiontransport@gmail.com') THEN
    test_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      test_user_id,
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

    INSERT INTO public.users (id, email, name, role)
    VALUES (test_user_id, 'brsolutiontransport@gmail.com', 'BR Solution Transport', 'admin')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'brsolutiontransport@gmail.com' LIMIT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.whatsapp_instances WHERE user_id = test_user_id) THEN
    INSERT INTO public.whatsapp_instances (
      id, user_id, instance_name, status, qrcode, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      test_user_id,
      'test_instance_' || substr(replace(test_user_id::text, '-', ''), 1, 8),
      'disconnected',
      NULL,
      NOW(), NOW()
    );
  END IF;
END $$;
