-- Ensure RLS is enabled for the table
ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure idempotency and a clean state
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;

-- 1. SELECT: Users can only read their own instances
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 2. INSERT: Users can only insert records where they are the owner
CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 3. UPDATE: Users can only update their own records, and cannot reassign ownership
CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

-- 4. DELETE: Users can only delete their own records
CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
  FOR DELETE TO authenticated USING (user_id = auth.uid());
