ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_id TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS client_token TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS webhook_token TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS connected BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'z-api';

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_id TEXT,
  message_id TEXT,
  chat_id TEXT,
  phone TEXT,
  direction TEXT,
  type TEXT,
  text TEXT,
  media_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_message_id_key ON public.whatsapp_messages (message_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_user_id_idx ON public.whatsapp_messages (user_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_chat_id_idx ON public.whatsapp_messages (chat_id);

ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS instance_id TEXT;
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS status INTEGER;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_messages_select" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_select" ON public.whatsapp_messages
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_messages_insert" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_insert" ON public.whatsapp_messages
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_messages_update" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_update" ON public.whatsapp_messages
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "whatsapp_messages_delete" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_delete" ON public.whatsapp_messages
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

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
      '{"name": "BR Solution"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.users (id, email, name, role)
    VALUES (new_user_id, 'brsolutiontransport@gmail.com', 'BR Solution', 'admin')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
