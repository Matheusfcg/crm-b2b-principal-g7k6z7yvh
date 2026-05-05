ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS itens jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS validade timestamptz;
