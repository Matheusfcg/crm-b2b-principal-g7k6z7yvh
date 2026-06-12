DO $$
DECLARE
  new_user_id uuid;
BEGIN
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
      '{"name": "Admin"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, name, email, role)
    VALUES (new_user_id, 'Administrador', 'brsolutiontransport@gmail.com', 'admin')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.whatsapp_instances (
      id, user_id, instance_name, status, instance_token, instance_external_id, server_url
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      '8127b6a5-1564-40f3-bba1-a5540d44cd51',
      'disconnected',
      '8127b6a5-1564-40f3-bba1-a5540d44cd51',
      '8127b6a5-1564-40f3-bba1-a5540d44cd51',
      'https://apiwhatsvexaview.uazapi.com'
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;
END $$;
