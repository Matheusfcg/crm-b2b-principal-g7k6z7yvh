DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Captura o primeiro usuário registrado para atrelar a instância
  SELECT id INTO v_user_id FROM public.users ORDER BY created_at ASC LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.whatsapp_instances (user_id, instance_name, status, last_error)
    VALUES (v_user_id, 'teste', 'disconnected', NULL)
    ON CONFLICT (instance_name) DO UPDATE 
    SET last_error = NULL, status = 'disconnected';
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    -- Caso o usuário já possua uma instância registrada (devido à UNIQUE(user_id)),
    -- ignora silenciosamente para não quebrar a execução.
    NULL;
END $$;
