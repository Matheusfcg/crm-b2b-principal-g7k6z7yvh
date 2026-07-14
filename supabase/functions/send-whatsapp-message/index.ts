import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  corsHeaders,
  jsonResponse,
  getAuthUser,
  getInstanceByUserId,
  zapiFetch,
} from '../_shared/zapi-client.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { user, error: authError } = await getAuthUser(req)
  if (!user) return jsonResponse({ error: authError }, 401)

  const instance = await getInstanceByUserId(user.id)
  if (!instance) return jsonResponse({ error: 'Instância Z-API não configurada' }, 404)

  const body = await req.json()
  const { phone, message } = body
  if (!phone || !message) {
    return jsonResponse({ error: 'Parâmetros "phone" e "message" são obrigatórios' }, 400)
  }

  const result = await zapiFetch(instance, '/send-text', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  })

  if (result.ok && result.data?.messageId) {
    const sb = getSupabaseAdmin()
    await sb.from('whatsapp_messages').insert({
      user_id: user.id,
      instance_id: instance.instance_id,
      message_id: result.data.messageId,
      chat_id: phone,
      phone,
      direction: 'outbound',
      type: 'text',
      text: message,
      status: 'sent',
    })
  }

  return jsonResponse({ success: result.ok, data: result.data })
})
