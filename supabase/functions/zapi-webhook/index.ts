import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse } from '../_shared/zapi.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const MESSAGE_EVENTS = [
  'on-message-received',
  'on-message-outer-sent',
  'on-message-sent',
  'on-message-created',
  'on-message-upsert',
]

const CONNECTION_EVENTS = [
  'on-connection-update',
  'on-qrcode-update',
  'on-instance-logout',
  'on-instance-connected',
]

function extractText(msg: any): string {
  if (!msg) return ''
  if (typeof msg.text === 'string') return msg.text
  if (msg.text?.message) return msg.text.message
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
  if (msg.extendedTextMessage?.caption) return msg.extendedTextMessage.caption
  if (msg.conversation) return msg.conversation
  if (msg.message) return msg.message
  if (msg.caption) return msg.caption
  if (msg.content) return msg.content
  return ''
}

function normalizeType(msg: any): string {
  const rawType = (msg.type || '').toLowerCase()
  const typeMap: Record<string, string> = {
    chat: 'chat',
    text: 'chat',
    conversation: 'chat',
    image: 'image',
    imagemessage: 'image',
    video: 'video',
    videomessage: 'video',
    audio: 'audio',
    audiomessage: 'audio',
    ptt: 'audio',
    document: 'document',
    documentmessage: 'document',
    sticker: 'sticker',
    stickermessage: 'sticker',
  }
  return typeMap[rawType] || rawType || 'chat'
}

function extractPhone(msg: any): string {
  return msg.phone || msg.from || msg.chatId || msg.sender || msg.recipient || ''
}

function extractMessageId(msg: any): string {
  return msg.messageId || msg.id || msg.key?.id || ''
}

async function logWebhook(
  sb: any,
  params: {
    userId: string | null
    instanceId: string | null
    endpoint: string
    payload: any
    response: any
    status: number
  },
) {
  try {
    await sb.from('whatsapp_logs').insert({
      user_id: params.userId,
      instance_id: params.instanceId,
      instance_name: params.instanceId,
      endpoint: params.endpoint,
      payload: params.payload || null,
      response: params.response || null,
      status: params.status,
    })
  } catch (err) {
    console.error('Log error:', err)
  }
}

async function syncInteraction(
  sb: any,
  params: {
    userId: string
    phone: string
    text: string
    direction: string
    type: string
  },
) {
  try {
    const cleanPhone = params.phone.replace(/\D/g, '')
    if (!cleanPhone) return

    const { data: leads } = await sb
      .from('leads')
      .select('id, telefone')
      .ilike('telefone', `%${cleanPhone}%`)
      .limit(1)

    if (!leads || leads.length === 0) return

    const lead = leads[0]
    const description = params.text
      ? `[WhatsApp ${params.direction}] ${params.text}`.substring(0, 500)
      : `[WhatsApp ${params.direction}] Mídia (${params.type})`

    await sb.from('interactions').insert({
      lead_id: lead.id,
      user_id: params.userId,
      tipo: 'WhatsApp',
      descricao: description,
      data: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Interaction sync error:', err)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const sb = createClient(supabaseUrl, serviceKey)

  let payload: any = null

  try {
    payload = await req.json()
  } catch {
    await logWebhook(sb, {
      userId: null,
      instanceId: null,
      endpoint: 'webhook',
      payload: null,
      response: { error: 'Invalid JSON payload' },
      status: 200,
    })
    return jsonResponse({ received: true, error: 'Invalid JSON' }, 200)
  }

  try {
    const instanceId = payload.instance || payload.instanceId || payload.instance_id
    const event = payload.event || payload.type || ''

    if (!instanceId) {
      await logWebhook(sb, {
        userId: null,
        instanceId: null,
        endpoint: `webhook/${event || 'unknown'}`,
        payload,
        response: { error: 'Instance não identificado no payload' },
        status: 200,
      })
      return jsonResponse({ received: true, error: 'Instance não identificado' }, 200)
    }

    const { data: instance } = await sb
      .from('whatsapp_instances')
      .select('id, user_id, webhook_token, instance_id')
      .eq('instance_id', instanceId)
      .eq('provider', 'z-api')
      .maybeSingle()

    if (!instance) {
      await logWebhook(sb, {
        userId: null,
        instanceId,
        endpoint: `webhook/${event}`,
        payload,
        response: { error: 'Instância não encontrada' },
        status: 200,
      })
      return jsonResponse({ received: true, error: 'Instância não encontrada' }, 200)
    }

    if (instance.webhook_token) {
      const providedToken = req.headers.get('webhook-token') || payload.webhookToken
      if (providedToken !== instance.webhook_token) {
        await logWebhook(sb, {
          userId: instance.user_id,
          instanceId: instance.instance_id,
          endpoint: `webhook/${event}`,
          payload,
          response: { error: 'Token do webhook inválido' },
          status: 403,
        })
        return jsonResponse({ error: 'Token do webhook inválido' }, 403)
      }
    }

    const msg = payload.data || payload

    if (
      CONNECTION_EVENTS.includes(event) ||
      event.includes('connection') ||
      event.includes('status')
    ) {
      const connected = msg.connected ?? msg.status === 'connected' ?? msg.state === 'CONNECTED'
      await sb
        .from('whatsapp_instances')
        .update({
          status: connected ? 'connected' : 'disconnected',
          phone: msg.phone || msg.number || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id)

      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId: instance.instance_id,
        endpoint: `webhook/${event}`,
        payload,
        response: { received: true, event: 'connection', connected },
        status: 200,
      })
      return jsonResponse({ received: true })
    }

    const isMessageEvent =
      MESSAGE_EVENTS.includes(event) ||
      (msg.messageId &&
        (msg.text || msg.message || msg.mediaUrl || msg.type || msg.extendedTextMessage))

    if (isMessageEvent) {
      const messageId = extractMessageId(msg)
      const phone = extractPhone(msg)
      const text = extractText(msg)
      const type = normalizeType(msg)
      const fromMe = msg.fromMe ?? false
      const direction = fromMe ? 'outbound' : 'inbound'
      const mediaUrl = msg.mediaUrl || msg.url || msg.fileUrl || null

      if (messageId) {
        const { data: existing } = await sb
          .from('whatsapp_messages')
          .select('id')
          .eq('message_id', messageId)
          .maybeSingle()

        if (!existing) {
          const { error: insertError } = await sb.from('whatsapp_messages').insert({
            user_id: instance.user_id,
            instance_id: instance.instance_id,
            message_id: messageId,
            chat_id: phone,
            phone,
            direction,
            type,
            text,
            media_url: mediaUrl,
            status: 'received',
            raw_payload: payload,
          })

          if (!insertError) {
            await syncInteraction(sb, {
              userId: instance.user_id,
              phone,
              text,
              direction,
              type,
            })
          }
        }
      }

      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId: instance.instance_id,
        endpoint: `webhook/${event}`,
        payload,
        response: { received: true, event: 'message', messageId, direction, type },
        status: 200,
      })
      return jsonResponse({ received: true })
    }

    await logWebhook(sb, {
      userId: instance.user_id,
      instanceId: instance.instance_id,
      endpoint: `webhook/${event}`,
      payload,
      response: { received: true, event: 'unknown', eventType: event },
      status: 200,
    })
    return jsonResponse({ received: true })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await logWebhook(sb, {
      userId: null,
      instanceId: payload?.instance || payload?.instanceId || payload?.instance_id || null,
      endpoint: `webhook/${payload?.event || payload?.type || 'unknown'}`,
      payload,
      response: { error: errorMsg },
      status: 200,
    })
    return jsonResponse({ received: true, error: 'Internal error' }, 200)
  }
})
