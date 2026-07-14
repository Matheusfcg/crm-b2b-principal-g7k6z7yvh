import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse, getAuthContext } from '../_shared/zapi.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { user, sb, instance, error } = await getAuthContext(req)
  if (!user) return jsonResponse({ error }, 401)

  const body = await req.json()
  const { instance_id, instance_token, client_token, webhook_token } = body
  if (!instance_id) return jsonResponse({ error: 'instance_id é obrigatório' }, 400)

  const data: Record<string, any> = {
    instance_id,
    provider: 'z-api',
    updated_at: new Date().toISOString(),
  }
  if (instance_token) data.instance_token = instance_token
  if (client_token) data.client_token = client_token
  if (webhook_token) data.webhook_token = webhook_token

  if (instance) {
    const { error: updateError } = await sb
      .from('whatsapp_instances')
      .update(data)
      .eq('id', instance.id)
    if (updateError) return jsonResponse({ error: updateError.message }, 500)
  } else {
    const { error: insertError } = await sb
      .from('whatsapp_instances')
      .insert({ ...data, user_id: user.id, status: 'disconnected' })
    if (insertError) return jsonResponse({ error: insertError.message }, 500)
  }

  const { data: fresh } = await sb
    .from('whatsapp_instances')
    .select('*')
    .eq('user_id', user.id)
    .eq('provider', 'z-api')
    .maybeSingle()

  const safe = fresh
    ? {
        id: fresh.id,
        user_id: fresh.user_id,
        provider: fresh.provider || 'z-api',
        instance_id: fresh.instance_id || '',
        status: fresh.status || 'disconnected',
        phone: fresh.phone || null,
        created_at: fresh.created_at,
        updated_at: fresh.updated_at,
        has_instance_token: !!fresh.instance_token,
        has_client_token: !!fresh.client_token,
        has_webhook_token: !!fresh.webhook_token,
      }
    : null

  return jsonResponse({ instance: safe })
})
