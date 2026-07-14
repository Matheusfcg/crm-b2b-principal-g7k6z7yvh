import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  corsHeaders,
  jsonResponse,
  getAuthUser,
  getInstanceByUserId,
  getSupabaseAdmin,
  zapiFetch,
} from '../_shared/zapi-client.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { user, error } = await getAuthUser(req)
  if (!user) return jsonResponse({ error }, 401)

  const { phone, message } = await req.json()
  if (!phone || !message) {
    return jsonResponse({ error: 'phone e message são obrigatórios' }, 400)
  }

  const instance = await getInstanceByUserId(user.id)
  if (!instance) return jsonResponse({ error: 'Instância Z-API não configurada' }, 404)

  const result = await zapiFetch(instance, '/send-text', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  })

  const sb = getSupabaseAdmin()
  await sb.from('whatsapp_messages').insert({
    user_id: user.id,
    instance_id: instance.instance_id,
    message_id: result.data?.messageId || null,
    chat_id: phone,
    phone,
    direction: 'outbound',
    type: 'text',
    text: message,
    status: result.ok ? 'sent' : 'failed',
    raw_payload: result.data || null,
  })

  return jsonResponse({ success: result.ok, data: result.data })
})
