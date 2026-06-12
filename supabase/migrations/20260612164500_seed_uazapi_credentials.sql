DO $$
DECLARE
  target_user_id uuid := '45d7bc68-8b3b-4b49-886a-430eb1ba5f56'::uuid;
BEGIN
  -- Ensure the target user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      target_user_id,
      '00000000-0000-0000-0000-000000000000',
      'matheusfcg250@gmail.com',
      crypt('Skip@Pass123!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Matheus"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );
  END IF;

  -- Ensure the user profile exists
  INSERT INTO public.users (id, email, name, role)
  VALUES (target_user_id, 'matheusfcg250@gmail.com', 'Matheus', 'admin')
  ON CONFLICT (id) DO NOTHING;

  -- Seed the Uazapi instance credentials
  INSERT INTO public.whatsapp_instances (
    user_id,
    instance_name,
    instance_token,
    server_url,
    phone,
    status,
    created_at,
    updated_at
  ) VALUES (
    target_user_id,
    'VexaView',
    '8127b6a5-1564-40f3-bba1-a5540d44cd51',
    'https://apiwhatsvexaview.uazapi.com',
    '5511944859278',
    'connected',
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    instance_name = EXCLUDED.instance_name,
    instance_token = EXCLUDED.instance_token,
    server_url = EXCLUDED.server_url,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status,
    updated_at = NOW();

END $$;
