DO $$
BEGIN
  -- Enable RLS on whatsapp_instances just in case it wasn't enabled
  ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies to make the migration idempotent
  DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
  DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
  DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
  DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;

  -- Also drop the previous policies shown in the context file, to prevent conflicts
  DROP POLICY IF EXISTS "Instances_select" ON public.whatsapp_instances;
  DROP POLICY IF EXISTS "Instances_insert" ON public.whatsapp_instances;
  DROP POLICY IF EXISTS "Instances_update" ON public.whatsapp_instances;
  DROP POLICY IF EXISTS "Instances_delete" ON public.whatsapp_instances;
END $$;

-- Recreate policies correctly restricting to the authenticated user
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated USING (user_id = auth.uid());
