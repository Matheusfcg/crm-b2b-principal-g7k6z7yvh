ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp_external_id TEXT;
CREATE INDEX IF NOT EXISTS leads_whatsapp_external_id_idx ON public.leads(whatsapp_external_id);
