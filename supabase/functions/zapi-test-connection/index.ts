import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse, getAuthContext, callZapi, logApiCall } from '../_shared/zapi.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { user, sb, instance, error } = await getAuthContext(req)
  if (!user) return jsonResponse({ error }, 401)
  if (!instance) return jsonResponse({ error: 'Instância Z-API não configurada' }, 404)

  const result = await callZapi(
    instance.instance_id,
    instance.instance_token,
    instance.client_token,
    '/status',
  )
  await logApiCall(sb, user.id, instance.instance_id, '/status', null, result.data, result.status)

  const connected = result.ok && result.data?.connected === true
  await sb
    .from('whatsapp_instances')
    .update({
      connected,
      status: connected ? 'connected' : 'disconnected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', instance.id)

  return jsonResponse({ connected, data: result.data })
})
