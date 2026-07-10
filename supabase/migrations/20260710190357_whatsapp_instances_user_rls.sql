-- Ensure RLS is enabled on whatsapp_instances
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to make migration idempotent
DROP POLICY IF EXISTS "whatsapp_instances_all" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;

-- Allow authenticated users to SELECT their own instances (admins can see all)
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Allow authenticated users to INSERT their own instances
CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to UPDATE their own instances
CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  ) WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to DELETE their own instances
CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Ensure configuracoes_whatsapp RLS policies are correct (idempotent)
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

-- Ensure messages table has media columns (idempotent)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_filename TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_mimetype TEXT;

-- Ensure users table has chat_wallpaper column (idempotent)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS chat_wallpaper TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ensure chat-media storage bucket exists
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;

-- Ensure chat-media storage policies
DROP POLICY IF EXISTS "chat_media_select" ON storage.objects;
CREATE POLICY "chat_media_select" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_insert" ON storage.objects;
CREATE POLICY "chat_media_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_update" ON storage.objects;
CREATE POLICY "chat_media_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_delete" ON storage.objects;
CREATE POLICY "chat_media_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media');

-- Ensure wallpapers storage bucket exists
INSERT INTO storage.buckets (id, name, public) VALUES ('wallpapers', 'wallpapers', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "wallpapers_select" ON storage.objects;
CREATE POLICY "wallpapers_select" ON storage.objects FOR SELECT USING (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "wallpapers_insert" ON storage.objects;
CREATE POLICY "wallpapers_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "wallpapers_update" ON storage.objects;
CREATE POLICY "wallpapers_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "wallpapers_delete" ON storage.objects;
CREATE POLICY "wallpapers_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'wallpapers');
