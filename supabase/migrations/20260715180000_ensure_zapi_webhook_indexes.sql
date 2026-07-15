-- Ensure all required indexes exist for Z-API webhook performance (idempotent)
DO $$
BEGIN
  -- Index on whatsapp_instances.instance_id for webhook instance lookups
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_whatsapp_instances_instance_id'
    AND schemaname = 'public'
  ) THEN
    CREATE INDEX idx_whatsapp_instances_instance_id
      ON public.whatsapp_instances (instance_id);
  END IF;

  -- Index on leads.telefone for auto-contact phone matching
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_leads_telefone'
    AND schemaname = 'public'
  ) THEN
    CREATE INDEX idx_leads_telefone
      ON public.leads (telefone);
  END IF;

  -- Composite index on whatsapp_messages for conversation queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_whatsapp_messages_user_phone_created'
    AND schemaname = 'public'
  ) THEN
    CREATE INDEX idx_whatsapp_messages_user_phone_created
      ON public.whatsapp_messages (user_id, phone, created_at DESC);
  END IF;

  -- Index on whatsapp_messages.chat_id for chat-based queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'whatsapp_messages_chat_id_idx'
    AND schemaname = 'public'
  ) THEN
    CREATE INDEX whatsapp_messages_chat_id_idx
      ON public.whatsapp_messages (chat_id);
  END IF;

  -- Index on whatsapp_messages.user_id for user-scoped queries
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'whatsapp_messages_user_id_idx'
    AND schemaname = 'public'
  ) THEN
    CREATE INDEX whatsapp_messages_user_id_idx
      ON public.whatsapp_messages (user_id);
  END IF;
END $$;

-- Ensure unique constraint on whatsapp_messages.message_id for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_messages_message_id_key'
    AND conrelid = 'whatsapp_messages'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'whatsapp_messages_message_id_key'
    AND schemaname = 'public'
  ) THEN
    ALTER TABLE public.whatsapp_messages
      ADD CONSTRAINT whatsapp_messages_message_id_key UNIQUE (message_id);
  END IF;
END $$;

-- Ensure realtime publication includes whatsapp_messages
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
