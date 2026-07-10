ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_filename TEXT;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_mimetype TEXT;

INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_media_select" ON storage.objects;
CREATE POLICY "chat_media_select" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_insert" ON storage.objects;
CREATE POLICY "chat_media_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_update" ON storage.objects;
CREATE POLICY "chat_media_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chat-media');

DROP POLICY IF EXISTS "chat_media_delete" ON storage.objects;
CREATE POLICY "chat_media_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-media');
