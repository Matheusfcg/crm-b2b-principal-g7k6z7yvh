-- Add unread_count to conversations safely
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS unread_count INT NOT NULL DEFAULT 0;

-- Add status to messages safely
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent';

-- Create index for faster querying if not exists
CREATE INDEX IF NOT EXISTS conversations_updated_at_idx ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS messages_timestamp_idx ON public.messages(timestamp DESC);
