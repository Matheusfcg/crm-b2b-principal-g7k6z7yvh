DO $$
BEGIN
  -- Ensure table exists with correct schema
  CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    instance_name TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'disconnected',
    qrcode TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_connection TIMESTAMPTZ,
    phone TEXT,
    instance_token TEXT,
    instance_external_id TEXT
  );

  -- Ensure RLS is enabled
  ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
END $$;

-- Drop existing policies to make this idempotent
DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;

-- Recreate policies for user-level access
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated USING (user_id = auth.uid());
