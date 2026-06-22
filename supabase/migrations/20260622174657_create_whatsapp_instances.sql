-- Re-establish whatsapp_instances table as per AC
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT UNIQUE NOT NULL,
  instance_token TEXT,
  server_url TEXT,
  status TEXT DEFAULT 'disconnected',
  qrcode TEXT,
  phone TEXT,
  last_connection TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fix tables with RLS enabled but no policies
DROP POLICY IF EXISTS "whatsapp_instances_all" ON public.whatsapp_instances;
CREATE POLICY "whatsapp_instances_all" ON public.whatsapp_instances
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Seed the brsolutiontransport user
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
      '{"name": "Admin BRSolution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    
    INSERT INTO public.users (id, email, name, role)
    VALUES (new_user_id, 'brsolutiontransport@gmail.com', 'Admin BRSolution', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
