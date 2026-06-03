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
      crypt('Skip@Pass123!', gen_salt('bf')),
      NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin BRSolution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '',
      NULL, '', '', ''
    );

    INSERT INTO public.users (id, email, name, role)
    VALUES (new_user_id, 'brsolutiontransport@gmail.com', 'Admin BRSolution', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_user_id_key ON public.whatsapp_instances (user_id);

DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances FOR DELETE TO authenticated USING (user_id = auth.uid());
