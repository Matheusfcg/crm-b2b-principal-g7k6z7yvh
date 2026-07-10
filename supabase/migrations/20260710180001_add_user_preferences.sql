ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS chat_wallpaper TEXT;

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('wallpapers', 'wallpapers', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatar public access" ON storage.objects;
CREATE POLICY "Avatar public access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar insert" ON storage.objects;
CREATE POLICY "Avatar insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
CREATE POLICY "Avatar update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
CREATE POLICY "Avatar delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Wallpaper public access" ON storage.objects;
CREATE POLICY "Wallpaper public access" ON storage.objects FOR SELECT USING (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "Wallpaper insert" ON storage.objects;
CREATE POLICY "Wallpaper insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "Wallpaper update" ON storage.objects;
CREATE POLICY "Wallpaper update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'wallpapers');

DROP POLICY IF EXISTS "Wallpaper delete" ON storage.objects;
CREATE POLICY "Wallpaper delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'wallpapers');
