-- Comprehensive RLS and schema fix for WhatsApp integration
-- Ensures all policies are correct, non-conflicting, and schema is complete

-- Ensure messages table has all required columns
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_filename TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_mimetype TEXT;

-- Ensure conversations table has unread_count
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Ensure whatsapp_instances has all required columns
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS instance_token TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS server_url TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS qrcode TEXT;

-- Ensure users table has preference columns
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS chat_wallpaper TEXT;

-- Ensure unique index on messages.message_id
DO $$
BEGIN
  BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS messages_message_id_key ON public.messages (message_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create unique index on messages.message_id: %', SQLERRM;
  END;
END $$;

-- Add tables to realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_whatsapp ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to eliminate conflicts
DROP POLICY IF EXISTS "whatsapp_instances_all" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Instances_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Instances_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Instances_update" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Instances_delete" ON public.whatsapp_instances;

DROP POLICY IF EXISTS "contacts_all" ON public.contacts;
DROP POLICY IF EXISTS "contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete" ON public.contacts;
DROP POLICY IF EXISTS "Contacts_select" ON public.contacts;
DROP POLICY IF EXISTS "Contacts_insert" ON public.contacts;
DROP POLICY IF EXISTS "Contacts_update" ON public.contacts;
DROP POLICY IF EXISTS "Contacts_delete" ON public.contacts;

DROP POLICY IF EXISTS "conversations_all" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete" ON public.conversations;
DROP POLICY IF EXISTS "Conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "Conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "Conversations_update" ON public.conversations;
DROP POLICY IF EXISTS "Conversations_delete" ON public.conversations;

DROP POLICY IF EXISTS "messages_all" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_update" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
DROP POLICY IF EXISTS "Messages_select" ON public.messages;
DROP POLICY IF EXISTS "Messages_insert" ON public.messages;
DROP POLICY IF EXISTS "Messages_update" ON public.messages;
DROP POLICY IF EXISTS "Messages_delete" ON public.messages;

DROP POLICY IF EXISTS "configuracoes_whatsapp_select" ON public.configuracoes_whatsapp;
DROP POLICY IF EXISTS "configuracoes_whatsapp_insert" ON public.configuracoes_whatsapp;
DROP POLICY IF EXISTS "configuracoes_whatsapp_update" ON public.configuracoes_whatsapp;
DROP POLICY IF EXISTS "configuracoes_whatsapp_delete" ON public.configuracoes_whatsapp;

-- Recreate whatsapp_instances policies
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  ) WITH CHECK (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Recreate contacts policies
CREATE POLICY "contacts_select" ON public.contacts
  FOR SELECT TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
CREATE POLICY "contacts_insert" ON public.contacts
  FOR INSERT TO authenticated WITH CHECK (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "contacts_update" ON public.contacts
  FOR UPDATE TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "contacts_delete" ON public.contacts
  FOR DELETE TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );

-- Recreate conversations policies
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "conversations_update" ON public.conversations
  FOR UPDATE TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );
CREATE POLICY "conversations_delete" ON public.conversations
  FOR DELETE TO authenticated USING (
    instance_id IN (SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid())
  );

-- Recreate messages policies
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE instance_id IN (
        SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE instance_id IN (
        SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE TO authenticated USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE instance_id IN (
        SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()
      )
    )
  );
CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE TO authenticated USING (
    conversation_id IN (
      SELECT id FROM public.conversations WHERE instance_id IN (
        SELECT id FROM public.whatsapp_instances WHERE user_id = auth.uid()
      )
    )
  );

-- Recreate configuracoes_whatsapp policies
CREATE POLICY "configuracoes_whatsapp_select" ON public.configuracoes_whatsapp
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "configuracoes_whatsapp_insert" ON public.configuracoes_whatsapp
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "configuracoes_whatsapp_update" ON public.configuracoes_whatsapp
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "configuracoes_whatsapp_delete" ON public.configuracoes_whatsapp
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('wallpapers', 'wallpapers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-media
DROP POLICY IF EXISTS "chat_media_select" ON storage.objects;
CREATE POLICY "chat_media_select" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
DROP POLICY IF EXISTS "chat_media_insert" ON storage.objects;
CREATE POLICY "chat_media_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');
DROP POLICY IF EXISTS "chat_media_update" ON storage.objects;
CREATE POLICY "chat_media_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chat-media');
DROP POLICY IF EXISTS "chat_media_delete" ON storage.objects;
CREATE POLICY "chat_media_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media');

-- Storage policies for wallpapers
DROP POLICY IF EXISTS "wallpapers_select" ON storage.objects;
DROP POLICY IF EXISTS "Wallpaper public access" ON storage.objects;
CREATE POLICY "wallpapers_select" ON storage.objects FOR SELECT USING (bucket_id = 'wallpapers');
DROP POLICY IF EXISTS "wallpapers_insert" ON storage.objects;
DROP POLICY IF EXISTS "Wallpaper insert" ON storage.objects;
CREATE POLICY "wallpapers_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'wallpapers');
DROP POLICY IF EXISTS "wallpapers_update" ON storage.objects;
DROP POLICY IF EXISTS "Wallpaper update" ON storage.objects;
CREATE POLICY "wallpapers_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'wallpapers');
DROP POLICY IF EXISTS "wallpapers_delete" ON storage.objects;
DROP POLICY IF EXISTS "Wallpaper delete" ON storage.objects;
CREATE POLICY "wallpapers_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'wallpapers');

-- Storage policies for avatars
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public access" ON storage.objects;
CREATE POLICY "avatars_select" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatar insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
