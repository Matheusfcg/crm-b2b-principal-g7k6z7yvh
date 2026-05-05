DO $$
BEGIN
  -- 1. Create public.users if it doesn't exist
  CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'vendedor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- 2. Enable RLS
  ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

  -- 3. Copy existing data from profiles to users
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.users (id, name, role, email)
    SELECT p.id, p.name, p.role::text, COALESCE(a.email, '')
    FROM public.profiles p
    LEFT JOIN auth.users a ON p.id = a.id
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 4. Update foreign keys from profiles to users
ALTER TABLE public.interactions DROP CONSTRAINT IF EXISTS interactions_user_id_fkey;
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_created_by_fkey;
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_user_id_fkey;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;

ALTER TABLE public.interactions ADD CONSTRAINT interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.leads ADD CONSTRAINT leads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. Drop profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 6. Update RLS policies
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;

CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING ((id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));

-- Recreate dependent policies on other tables using public.users
DROP POLICY IF EXISTS "interactions_delete" ON public.interactions;
DROP POLICY IF EXISTS "interactions_select" ON public.interactions;
DROP POLICY IF EXISTS "interactions_update" ON public.interactions;

CREATE POLICY "interactions_delete" ON public.interactions FOR DELETE TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));
CREATE POLICY "interactions_select" ON public.interactions FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));
CREATE POLICY "interactions_update" ON public.interactions FOR UPDATE TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));

DROP POLICY IF EXISTS "leads_delete" ON public.leads;
DROP POLICY IF EXISTS "leads_select" ON public.leads;
DROP POLICY IF EXISTS "leads_update" ON public.leads;

CREATE POLICY "leads_delete" ON public.leads FOR DELETE TO authenticated USING ((created_by = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));
CREATE POLICY "leads_select" ON public.leads FOR SELECT TO authenticated USING ((created_by = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));
CREATE POLICY "leads_update" ON public.leads FOR UPDATE TO authenticated USING ((created_by = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));

DROP POLICY IF EXISTS "proposals_delete" ON public.proposals;
DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
DROP POLICY IF EXISTS "proposals_update" ON public.proposals;

CREATE POLICY "proposals_delete" ON public.proposals FOR DELETE TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));
CREATE POLICY "proposals_select" ON public.proposals FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));
CREATE POLICY "proposals_update" ON public.proposals FOR UPDATE TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));

DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated USING ((user_id = auth.uid()) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'gerente'))));

-- Recreate functions to use public.users
CREATE OR REPLACE FUNCTION public.admin_create_user(new_email text, new_password text, new_name text, new_role text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem criar usuários.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
    RAISE EXCEPTION 'E-mail já está em uso.';
  END IF;

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
    new_email,
    crypt(new_password, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', new_name),
    false, 'authenticated', 'authenticated',
    '', '', '', '', '',
    NULL, '', '', ''
  );

  INSERT INTO public.users (id, name, email, role)
  VALUES (new_user_id, new_name, new_email, new_role)
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role;

  RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user(target_user_id uuid, new_name text, new_role text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem editar usuários.';
  END IF;

  UPDATE public.users
  SET name = new_name, role = new_role
  WHERE id = target_user_id;

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{name}', to_jsonb(new_name))
  WHERE id = target_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'vendedor'
  )
  ON CONFLICT (id) DO UPDATE 
  SET name = EXCLUDED.name, email = EXCLUDED.email;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
