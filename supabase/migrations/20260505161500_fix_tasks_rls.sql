DO $$
BEGIN
  -- Add update and delete policies for tasks
  DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
  CREATE POLICY "tasks_update" ON public.tasks
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin')))
    WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin')));

  DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
  CREATE POLICY "tasks_delete" ON public.tasks
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin')));
    
  -- Also for interactions, add update and delete if missing
  DROP POLICY IF EXISTS "interactions_update" ON public.interactions;
  CREATE POLICY "interactions_update" ON public.interactions
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin')))
    WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin')));

  DROP POLICY IF EXISTS "interactions_delete" ON public.interactions;
  CREATE POLICY "interactions_delete" ON public.interactions
    FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('gerente', 'admin')));
END $$;
