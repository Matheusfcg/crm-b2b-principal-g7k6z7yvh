import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse } from '../_shared/zapi.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const sb = createClient(supabaseUrl, serviceKey)

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const instanceId = payload.instance || payload.instanceId || payload.instance_id
  const event = payload.event || payload.type || ''

  if (!instanceId) {
    return jsonResponse({ error: 'instance não identificado no payload' }, 400)
  }

  const { data: instance } = await sb
    .from('whatsapp_instances')
    .select('id, user_id, webhook_token, instance_id')
    .eq('instance_id', instanceId)
    .eq('provider', 'z-api')
    .maybeSingle()

  if (!instance) {
    return jsonResponse({ error: 'Instância não encontrada' }, 404)
  }

  if (instance.webhook_token) {
    const providedToken = req.headers.get('webhook-token') || payload.webhookToken
    if (providedToken !== instance.webhook_token) {
      return jsonResponse({ error: 'Token do webhook inválido' }, 403)
    }
  }

  const msg = payload.data || payload
  const messageId = msg.messageId || msg.id || msg.key?.id
  const phone = msg.phone || msg.from || msg.chatId || ''

  if (event.includes('message') || event.includes('received') || msg.message) {
    if (messageId) {
      const { data: existing } = await sb
        .from('whatsapp_messages')
        .select('id')
        .eq('message_id', messageId)
        .maybeSingle()

      if (!existing) {
        const text = msg.text || msg.message || msg.caption || msg.content || ''
        const type = msg.type || (msg.mediaUrl ? 'media' : 'text')
        const mediaUrl = msg.mediaUrl || msg.url || msg.fileUrl || null

        await sb.from('whatsapp_messages').insert({
          user_id: instance.user_id,
          instance_id: instance.instance_id,
          message_id: messageId,
          chat_id: phone,
          phone,
          direction: 'incoming',
          type,
          text,
          media_url: mediaUrl,
          status: 'received',
        })
      }
    }
  }

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
  }

  return jsonResponse({ received: true })
})
