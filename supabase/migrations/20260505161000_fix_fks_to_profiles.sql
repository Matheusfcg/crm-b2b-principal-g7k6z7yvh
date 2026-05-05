DO $$
BEGIN
  -- Drop existing constraints that reference auth.users
  ALTER TABLE public.interactions DROP CONSTRAINT IF EXISTS interactions_user_id_fkey;
  ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_user_id_fkey;
  ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_user_id_fkey;
  ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_created_by_fkey;

  -- Add constraints referencing public.profiles to allow PostgREST joins
  ALTER TABLE public.interactions 
    ADD CONSTRAINT interactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    
  ALTER TABLE public.tasks 
    ADD CONSTRAINT tasks_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    
  ALTER TABLE public.proposals 
    ADD CONSTRAINT proposals_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    
  ALTER TABLE public.leads 
    ADD CONSTRAINT leads_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
END $$;
