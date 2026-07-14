-- Remove legacy Meta API / Old integrations tables
DO $BLOCK$
BEGIN
  DROP TABLE IF EXISTS public.whatsapp_accounts CASCADE;
  DROP TABLE IF EXISTS public.configuracoes_whatsapp CASCADE;
  DROP TABLE IF EXISTS public.contacts CASCADE;
  DROP TABLE IF EXISTS public.conversations CASCADE;
  DROP TABLE IF EXISTS public.messages CASCADE;
END $BLOCK$;
