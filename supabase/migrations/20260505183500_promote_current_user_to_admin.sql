DO $$
BEGIN
  -- 1. Ensure the user exists in public.users if they somehow only exist in auth.users
  INSERT INTO public.users (id, email, name, role)
  SELECT id, email, COALESCE(raw_user_meta_data->>'name', split_part(email, '@', 1)), 'admin'
  FROM auth.users
  WHERE email = 'brsolutiontransport@gmail.com'
  ON CONFLICT (id) DO UPDATE
  SET role = 'admin';

  -- 2. Update their role to admin directly (in case they already existed as another role)
  UPDATE public.users
  SET role = 'admin'
  WHERE email = 'brsolutiontransport@gmail.com';

  -- 3. If there's still no admin in the system, promote the very first registered user to admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE role = 'admin') THEN
    UPDATE public.users
    SET role = 'admin'
    WHERE id = (
      SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1
    );
  END IF;
END $$;
