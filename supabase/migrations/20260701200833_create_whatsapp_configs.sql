CREATE TABLE IF NOT EXISTS public.configuracoes_whatsapp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL UNIQUE,
  waba_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.configuracoes_whatsapp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracoes_whatsapp_select" ON public.configuracoes_whatsapp;
CREATE POLICY "configuracoes_whatsapp_select" ON public.configuracoes_whatsapp
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "configuracoes_whatsapp_insert" ON public.configuracoes_whatsapp;
CREATE POLICY "configuracoes_whatsapp_insert" ON public.configuracoes_whatsapp
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "configuracoes_whatsapp_update" ON public.configuracoes_whatsapp;
CREATE POLICY "configuracoes_whatsapp_update" ON public.configuracoes_whatsapp
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "configuracoes_whatsapp_delete" ON public.configuracoes_whatsapp;
CREATE POLICY "configuracoes_whatsapp_delete" ON public.configuracoes_whatsapp
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DO $$
DECLARE
  v_user_id uuid;
BEGIN
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
      '{"name": "BR Solution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = 'brsolutiontransport@gmail.com';

  INSERT INTO public.users (id, email, name, role)
  VALUES (v_user_id, 'brsolutiontransport@gmail.com', 'BR Solution', 'admin')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.configuracoes_whatsapp (user_id, phone_number_id, waba_id, access_token)
  VALUES (v_user_id, '106540000000000', '100000000000000', 'EAABplaceholderReplaceWithRealToken')
  ON CONFLICT (phone_number_id) DO NOTHING;

  INSERT INTO public.whatsapp_instances (user_id, instance_name, instance_token, server_url, status, phone)
  VALUES (v_user_id, 'meta_106540000000000', 'meta_cloud_api', 'https://graph.facebook.com', 'connected', '+5511999999999')
  ON CONFLICT (instance_name) DO NOTHING;
END $$;
