import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse, getAuthContext, callZapi, logApiCall } from '../_shared/zapi.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { user, sb, instance, error } = await getAuthContext(req)
  if (!user) return jsonResponse({ error }, 401)
  if (!instance) return jsonResponse({ error: 'Instância Z-API não configurada' }, 404)

  const { to, text } = await req.json()
  if (!to || !text) return jsonResponse({ error: 'Parâmetros "to" e "text" são obrigatórios' }, 400)

  const result = await callZapi(
    instance.instance_id,
    instance.instance_token,
    instance.client_token,
    '/send-text',
    'POST',
    { phone: to, message: text },
  )
  await logApiCall(
    sb,
    user.id,
    instance.instance_id,
    '/send-text',
    { to, text },
    result.data,
    result.status,
  )

  if (result.ok && result.data?.messageId) {
    await sb.from('whatsapp_messages').insert({
      user_id: user.id,
      instance_id: instance.instance_id,
      message_id: result.data.messageId,
      chat_id: to,
      phone: to,
      direction: 'outbound',
      type: 'text',
      text,
      status: 'sent',
    })
  }

  return jsonResponse({ success: result.ok, data: result.data })
})
