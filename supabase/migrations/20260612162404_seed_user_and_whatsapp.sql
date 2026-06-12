ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS server_url TEXT;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Insert user
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brsolutiontransport@gmail.com') THEN
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
      '{"name": "BR Solution Transport"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
    
    INSERT INTO public.users (id, name, email, role)
    VALUES (v_user_id, 'BR Solution Transport', 'brsolutiontransport@gmail.com', 'admin')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'brsolutiontransport@gmail.com' LIMIT 1;
  END IF;

  -- Insert WhatsApp instance
  INSERT INTO public.whatsapp_instances (
    user_id,
    instance_name,
    instance_token,
    phone,
    status,
    server_url,
    last_connection,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    'user_' || replace(v_user_id::text, '-', ''),
    '8127b6a5-1564-40f3-bba1-a5540d44cd51',
    '5511944859278',
    'connected',
    'https://apiwhatsvexaview.uazapi.com',
    NOW(),
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO UPDATE SET
    instance_token = EXCLUDED.instance_token,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status,
    server_url = EXCLUDED.server_url;

END $$;
