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
    '/disconnect',
    'POST',
  )
  await logApiCall(
    sb,
    user.id,
    instance.instance_id,
    '/disconnect',
    null,
    result.data,
    result.status,
  )

  await sb
    .from('whatsapp_instances')
    .update({
      status: 'disconnected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', instance.id)

  return jsonResponse({ success: result.ok, data: result.data })
})
