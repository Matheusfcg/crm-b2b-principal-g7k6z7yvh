import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  corsHeaders,
  jsonResponse,
  getInstanceByInstanceId,
  getSupabaseAdmin,
} from '../_shared/zapi-client.ts'
import {
  extractText,
  normalizeType,
  extractPhone,
  extractMessageId,
  logWebhook,
  syncInteraction,
} from '../_shared/webhook-helpers.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let payload: any
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const sb = getSupabaseAdmin()
  const instanceId = payload.instanceId || payload.instance || payload.instance_id
  const event = payload.event || payload.type || ''

  if (!instanceId) {
    await logWebhook(sb, {
      userId: null,
      instanceId: null,
      endpoint: `webhook/${event || 'unknown'}`,
      payload,
      response: { error: 'Instance não identificado' },
      status: 200,
    })
    return jsonResponse({ received: true, error: 'Instance não identificado' })
  }

  const instance = await getInstanceByInstanceId(instanceId)
  if (!instance) {
    await logWebhook(sb, {
      userId: null,
      instanceId,
      endpoint: `webhook/${event}`,
      payload,
      response: { error: 'Instância não encontrada' },
      status: 404,
    })
    return jsonResponse({ error: 'Instância não encontrada' }, 404)
  }

  const msg = payload.data || payload

  if (event.includes('connection') || event.includes('status')) {
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
      instanceId,
      endpoint: `webhook/${event}`,
      payload,
      response: { received: true, event: 'connection', connected },
      status: 200,
    })
    return jsonResponse({ received: true })
  }

  const phone = extractPhone(msg)
  const messageId = extractMessageId(msg)
  const text = extractText(msg)
  const type = normalizeType(msg)
  const fromMe = msg.fromMe ?? false
  const direction = fromMe ? 'outbound' : 'inbound'
  const mediaUrl = msg.mediaUrl || msg.url || msg.fileUrl || null

  if (!phone || (!text && !msg.message && !mediaUrl && !msg.type)) {
    await logWebhook(sb, {
      userId: instance.user_id,
      instanceId,
      endpoint: `webhook/${event}`,
      payload,
      response: { received: true, event: 'unknown' },
      status: 200,
    })
    return jsonResponse({ received: true })
  }

  if (messageId) {
    const { data: existing } = await sb
      .from('whatsapp_messages')
      .select('id')
      .eq('message_id', messageId)
      .maybeSingle()
    if (existing) {
      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId,
        endpoint: `webhook/${event}`,
        payload,
        response: { received: true, duplicate: true, messageId },
        status: 200,
      })
      return jsonResponse({ received: true, duplicate: true })
    }
  }

  try {
    const { error: insertError } = await sb.from('whatsapp_messages').insert({
      user_id: instance.user_id,
      instance_id: instanceId,
      message_id: messageId || null,
      chat_id: phone,
      phone,
      direction,
      type,
      text,
      media_url: mediaUrl,
      status: 'received',
      raw_payload: payload,
    })

    if (insertError) {
      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId,
        endpoint: `webhook/${event}`,
        payload,
        response: { error: insertError.message },
        status: 500,
      })
      return jsonResponse({ error: 'Erro ao salvar mensagem' }, 500)
    }

    if (!fromMe) {
      await syncInteraction(sb, {
        userId: instance.user_id,
        phone,
        text,
        direction,
        type,
      })
    }

    await logWebhook(sb, {
      userId: instance.user_id,
      instanceId,
      endpoint: `webhook/${event}`,
      payload,
      response: { received: true, event: 'message', messageId, direction, type },
      status: 200,
    })
    return jsonResponse({ received: true })
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    await logWebhook(sb, {
      userId: instance.user_id,
      instanceId,
      endpoint: `webhook/${event}`,
      payload,
      response: { error: errorMsg },
      status: 500,
    })
    return jsonResponse({ received: true, error: 'Internal error' }, 500)
  }
})
