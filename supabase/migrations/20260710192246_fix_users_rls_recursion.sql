-- Fix infinite recursion in public.users RLS policies
-- The previous policies queried public.users FROM WITHIN policies ON public.users,
-- causing "infinite recursion detected in policy for relation users" errors.
-- This blocked all operations including whatsapp_instances creation (500 errors).

-- Create a SECURITY DEFINER function to check admin/manager role
-- without triggering RLS recursion (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'gerente')
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager() TO authenticated;

-- ============================================================
-- Fix users table policies: replace recursive subqueries
-- ============================================================

-- SELECT: allow all authenticated users to read (no recursion)
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated USING (true);

-- INSERT: users can only insert their own row
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- UPDATE: users can update their own row; admins/managers can update any
-- Uses SECURITY DEFINER function instead of recursive subquery
DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.is_admin_or_manager()
  )
  WITH CHECK (
    id = auth.uid()
    OR public.is_admin_or_manager()
  );

-- DELETE: admins/managers can delete users
DROP POLICY IF EXISTS "users_delete" ON public.users;
CREATE POLICY "users_delete" ON public.users
  FOR DELETE TO authenticated USING (public.is_admin_or_manager());
