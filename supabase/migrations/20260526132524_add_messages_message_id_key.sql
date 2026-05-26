DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_message_id_key'
  ) THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_message_id_key UNIQUE (message_id);
  END IF;
END $$;
