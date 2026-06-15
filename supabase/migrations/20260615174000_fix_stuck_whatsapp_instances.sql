-- Set status to 'timeout' for instances that have been stuck in 'connecting' for more than 5 minutes
UPDATE public.whatsapp_instances
SET 
  status = 'timeout',
  last_error = 'O tempo limite da conexão expirou.',
  updated_at = NOW()
WHERE 
  status IN ('connecting', 'qrcode') 
  AND updated_at < NOW() - INTERVAL '5 minutes';
