import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  corsHeaders,
  jsonResponse,
  getInstanceByInstanceId,
  getSupabaseAdmin,
  zapiFetch,
} from '../_shared/zapi-client.ts'

function extractText(msg: any): string {
  if (!msg) return ''
  if (typeof msg.text === 'string') return msg.text
  if (msg.text?.message) return msg.text.message
  if (msg.message) return msg.message
  if (msg.caption) return msg.caption
  if (msg.content) return msg.content
  return ''
}

async function generateAiReply(params: {
  userId: string | null
  phone: string
  incomingMessage: string
}): Promise<string | null> {
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const instanceId = payload.instanceId || payload.instance || payload.instance_id
  if (!instanceId) return jsonResponse({ ignored: true })

  const instance = await getInstanceByInstanceId(instanceId)
  if (!instance) return jsonResponse({ error: 'Instância não encontrada' }, 404)

  const msg = payload.data || payload
  const phone = msg.phone || msg.from || msg.chatId || ''
  const messageId = msg.messageId || msg.id || msg.key?.id
  const text = extractText(msg)
  const fromMe = msg.fromMe ?? false
  const direction = fromMe ? 'outbound' : 'inbound'

  const sb = getSupabaseAdmin()

  const event = payload.event || payload.type || ''
  if (event.includes('connection') || event.includes('status')) {
    const connected = msg.connected ?? msg.status === 'connected'
    await sb
      .from('whatsapp_instances')
      .update({
        status: connected ? 'connected' : 'disconnected',
        phone: msg.phone || msg.number || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instance.id)
    return jsonResponse({ received: true })
  }

  if (phone && (text || msg.message || msg.mediaUrl)) {
    if (messageId) {
      const { data: existing } = await sb
        .from('whatsapp_messages')
        .select('id')
        .eq('message_id', messageId)
        .maybeSingle()
      if (existing) return jsonResponse({ received: true, duplicate: true })
    }

    await sb.from('whatsapp_messages').insert({
      user_id: instance.user_id,
      instance_id: instanceId,
      message_id: messageId,
      chat_id: phone,
      phone,
      direction,
      type: msg.type || 'text',
      text,
      media_url: msg.mediaUrl || msg.url || null,
      status: 'received',
      raw_payload: payload,
    })

    if (!fromMe && text) {
      const reply = await generateAiReply({
        userId: instance.user_id,
        phone,
        incomingMessage: text,
      })

      if (reply) {
        const replyResult = await zapiFetch(instance, '/send-text', {
          method: 'POST',
          body: JSON.stringify({ phone, message: reply }),
        })

        await sb.from('whatsapp_messages').insert({
          user_id: instance.user_id,
          instance_id: instanceId,
          message_id: replyResult.data?.messageId || null,
          chat_id: phone,
          phone,
          direction: 'outbound',
          type: 'text',
          text: reply,
          status: 'sent',
          raw_payload: replyResult.data || null,
        })
      }
    }
  }

  return jsonResponse({ received: true })
})
