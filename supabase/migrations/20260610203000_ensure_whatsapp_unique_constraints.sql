CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_user_id_key ON public.whatsapp_instances USING btree (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_instance_name_key ON public.whatsapp_instances USING btree (instance_name);
