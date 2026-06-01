ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS phone TEXT;

-- Drop and recreate RLS policies to satisfy AC
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;

CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances FOR DELETE TO authenticated USING (user_id = auth.uid());
