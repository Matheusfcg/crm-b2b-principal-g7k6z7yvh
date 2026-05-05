DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Seed an initial admin user idempotently
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
      '{"name": "Admin Principal"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.profiles (id, name, role)
    VALUES (new_user_id, 'Admin Principal', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = 'admin';
  ELSE
    -- Ensure it is an admin if already exists
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE id = (SELECT id FROM auth.users WHERE email = 'brsolutiontransport@gmail.com');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_create_user(
  new_email TEXT,
  new_password TEXT,
  new_name TEXT,
  new_role TEXT
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Security Check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar usuários.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
    RAISE EXCEPTION 'E-mail já está em uso.';
  END IF;

  new_user_id := gen_random_uuid();

  -- Insert into auth.users (requires SECURITY DEFINER to bypass GoTrue restrictions)
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
    new_email,
    crypt(new_password, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', new_name),
    false, 'authenticated', 'authenticated',
    '', '', '', '', '',
    NULL, '', '', ''
  );

  -- Upsert into profiles (handles conflict with auto-trigger)
  INSERT INTO public.profiles (id, name, role)
  VALUES (new_user_id, new_name, new_role)
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, role = EXCLUDED.role;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_update_user(
  target_user_id UUID,
  new_name TEXT,
  new_role TEXT
) RETURNS VOID AS $$
BEGIN
  -- Security Check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem editar usuários.';
  END IF;

  UPDATE public.profiles
  SET name = new_name, role = new_role
  WHERE id = target_user_id;

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{name}', to_jsonb(new_name))
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
