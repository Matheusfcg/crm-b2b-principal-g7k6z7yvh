CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'vendedor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa TEXT NOT NULL,
  contato TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  segmento TEXT NOT NULL,
  tamanho TEXT NOT NULL,
  origem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Novo',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create interactions
CREATE TABLE IF NOT EXISTS public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prazo TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create proposals
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  valor DECIMAL(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aberto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Policies for leads
DROP POLICY IF EXISTS "leads_select" ON public.leads;
CREATE POLICY "leads_select" ON public.leads FOR SELECT TO authenticated USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin'))
);

DROP POLICY IF EXISTS "leads_insert" ON public.leads;
CREATE POLICY "leads_insert" ON public.leads FOR INSERT TO authenticated WITH CHECK (
  created_by = auth.uid()
);

DROP POLICY IF EXISTS "leads_update" ON public.leads;
CREATE POLICY "leads_update" ON public.leads FOR UPDATE TO authenticated USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin'))
);

DROP POLICY IF EXISTS "leads_delete" ON public.leads;
CREATE POLICY "leads_delete" ON public.leads FOR DELETE TO authenticated USING (
  created_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin'))
);

-- Policies for interactions
DROP POLICY IF EXISTS "interactions_select" ON public.interactions;
CREATE POLICY "interactions_select" ON public.interactions FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin'))
);

DROP POLICY IF EXISTS "interactions_insert" ON public.interactions;
CREATE POLICY "interactions_insert" ON public.interactions FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
);

-- Policies for tasks
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin'))
);

DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
);

-- Policies for proposals
DROP POLICY IF EXISTS "proposals_select" ON public.proposals;
CREATE POLICY "proposals_select" ON public.proposals FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin'))
);

DROP POLICY IF EXISTS "proposals_insert" ON public.proposals;
CREATE POLICY "proposals_insert" ON public.proposals FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
);

-- Seeding
DO $$
DECLARE
  admin_id UUID;
  vendedor_id UUID;
  lead1_id UUID := gen_random_uuid();
  lead2_id UUID := gen_random_uuid();
  lead3_id UUID := gen_random_uuid();
BEGIN
  -- Insert Admin
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'brsolutiontransport@gmail.com') THEN
    admin_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      admin_id, '00000000-0000-0000-0000-000000000000', 'brsolutiontransport@gmail.com',
      crypt('Skip@Pass', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Administrador"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.profiles (id, name, role) VALUES (admin_id, 'Administrador', 'admin') ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO admin_id FROM auth.users WHERE email = 'brsolutiontransport@gmail.com';
  END IF;

  -- Insert Vendedor
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'vendedor@example.com') THEN
    vendedor_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
      is_super_admin, role, aud,
      confirmation_token, recovery_token, email_change_token_new,
      email_change, email_change_token_current,
      phone, phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      vendedor_id, '00000000-0000-0000-0000-000000000000', 'vendedor@example.com',
      crypt('Skip@Pass', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Vendedor"}',
      false, 'authenticated', 'authenticated',
      '', '', '', '', '', NULL, '', '', ''
    );
    INSERT INTO public.profiles (id, name, role) VALUES (vendedor_id, 'Vendedor', 'vendedor') ON CONFLICT (id) DO NOTHING;
  ELSE
    SELECT id INTO vendedor_id FROM auth.users WHERE email = 'vendedor@example.com';
  END IF;

  -- Seed data
  IF NOT EXISTS (SELECT 1 FROM public.leads LIMIT 1) THEN
    INSERT INTO public.leads (id, empresa, contato, email, telefone, segmento, tamanho, origem, status, created_by) VALUES
    (lead1_id, 'TechCorp Solutions', 'Ana Silva', 'ana@techcorp.com', '(11) 99999-1111', 'Tecnologia', '51-200', 'Inbound', 'Qualificado', admin_id),
    (lead2_id, 'Serviços Globais', 'Carlos Mendes', 'carlos@servicos.com', '(11) 98888-2222', 'Serviços', '200+', 'Indicação', 'Contatado', vendedor_id),
    (lead3_id, 'Indústria Alpha', 'Roberto Costa', 'roberto@alpha.com', '(21) 97777-3333', 'Indústria', '11-50', 'Outbound', 'Novo', vendedor_id);

    INSERT INTO public.interactions (lead_id, user_id, tipo, descricao) VALUES
    (lead1_id, admin_id, 'Reunião', 'Apresentação da solução e alinhamento de expectativas.'),
    (lead2_id, vendedor_id, 'Email', 'Envio de material institucional.'),
    (lead3_id, vendedor_id, 'Call', 'Primeiro contato de prospecção.');

    INSERT INTO public.tasks (lead_id, user_id, titulo, descricao, prazo, status) VALUES
    (lead1_id, admin_id, 'Enviar Proposta Comercial', 'Elaborar e enviar a proposta final para a Ana.', NOW() + INTERVAL '2 days', 'Pendente'),
    (lead2_id, vendedor_id, 'Follow-up de Material', 'Ligar para o Carlos para saber se viu o email.', NOW() + INTERVAL '1 day', 'Pendente'),
    (lead3_id, vendedor_id, 'Agendar Reunião', 'Tentar agendar demo com o Roberto.', NOW() - INTERVAL '1 day', 'Concluída');

    INSERT INTO public.proposals (lead_id, user_id, titulo, valor, status) VALUES
    (lead1_id, admin_id, 'Pacote Royal', 11250.00, 'Aberto'),
    (lead2_id, vendedor_id, 'Serviços Adaptativos', 3140.00, 'Ganho'),
    (lead3_id, vendedor_id, 'Segundo Negócio', 12350.00, 'Aberto');
  END IF;

END $$;
