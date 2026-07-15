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
  autoCreateContact,
  syncConversations,
} from '../_shared/webhook-helpers.ts'

const CONNECTION_EVENTS = [
  'on-connection-update',
  'on-qrcode-update',
  'on-instance-logout',
  'on-instance-connected',
]

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const reqHeaders = Object.fromEntries(req.headers.entries())
  console.log('[receive-webhook] === Webhook received ===')
  console.log('[receive-webhook] Request headers:', JSON.stringify(reqHeaders, null, 2))

  let payload: any
  try {
    payload = await req.json()
    console.log('[receive-webhook] Webhook body:', JSON.stringify(payload, null, 2))
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400)
  }

  const sb = getSupabaseAdmin()
  const xInstanceIdHeader = req.headers.get('x-instance-id')
  const instanceId =
    payload.instanceId || payload.instance || payload.instance_id || xInstanceIdHeader
  const instanceField = payload.instanceId
    ? 'body.instanceId'
    : payload.instance
      ? 'body.instance'
      : payload.instance_id
        ? 'body.instance_id'
        : xInstanceIdHeader
          ? 'x-instance-id header'
          : null
  const event = payload.event || payload.type || ''

  console.log(
    '[receive-webhook] Instance identification - field:',
    instanceField,
    '| value:',
    instanceId,
  )

  if (!instanceId) {
    await logWebhook(sb, {
      userId: null,
      instanceId: null,
      endpoint: `webhook/${event || 'unknown'}`,
      payload,
      response: { error: 'Instance não identificado', stage: 'instance_identification' },
      status: 200,
    })
    return jsonResponse({ received: true, error: 'Instance não identificado' })
  }

  const instance = await getInstanceByInstanceId(instanceId)
  if (!instance) {
    console.log('[receive-webhook] Instance not found for instance_id:', instanceId)
    await logWebhook(sb, {
      userId: null,
      instanceId,
      endpoint: `webhook/${event}`,
      payload,
      response: { error: 'Instância não encontrada', stage: 'instance_not_found' },
      status: 404,
    })
    return jsonResponse({ error: 'Instância não encontrada' }, 404)
  }

  console.log('[receive-webhook] Instance found:', instance.id, '| user:', instance.user_id)

  if (instance.webhook_token) {
    const providedToken = req.headers.get('webhook-token') || payload.webhookToken
    if (providedToken !== instance.webhook_token) {
      console.log('[receive-webhook] Invalid webhook token')
      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId,
        endpoint: `webhook/${event}`,
        payload,
        response: { error: 'Token inválido', stage: 'token_validation' },
        status: 403,
      })
      return jsonResponse({ error: 'Token do webhook inválido' }, 403)
    }
    console.log('[receive-webhook] Webhook token validated')
  } else {
    console.log('[receive-webhook] No webhook token configured, proceeding')
  }

  const msg = payload.data || payload

  if (
    CONNECTION_EVENTS.includes(event) ||
    event.includes('connection') ||
    event.includes('status')
  ) {
    console.log('[receive-webhook] Processing connection event:', event)
    const connected = msg.connected ?? msg.status === 'connected' ?? msg.state === 'CONNECTED'
    await sb
      .from('whatsapp_instances')
      .update({
        status: connected ? 'connected' : 'disconnected',
        phone: msg.phone || msg.number || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instance.id)

    if (connected) {
      console.log('[receive-webhook] Instance connected, initiating conversation sync')
      await syncConversations(sb, {
        instance_id: instance.instance_id,
        instance_token: instance.instance_token,
        client_token: instance.client_token,
        user_id: instance.user_id,
      })
    }

    await logWebhook(sb, {
      userId: instance.user_id,
      instanceId,
      endpoint: `webhook/${event}`,
      payload,
      response: { received: true, event: 'connection', connected },
      status: 200,
    })
    return jsonResponse({ received: true, event: 'connection', connected })
  }

  const phone = extractPhone(msg)
  const messageId = extractMessageId(msg)
  const text = extractText(msg)
  const type = normalizeType(msg)
  const fromMe = msg.fromMe ?? false
  const direction = fromMe ? 'outbound' : 'inbound'
  const mediaUrl = msg.mediaUrl || msg.url || msg.fileUrl || null

  console.log(
    '[receive-webhook] Message - id:',
    messageId,
    '| phone:',
    phone,
    '| dir:',
    direction,
    '| type:',
    type,
  )

  if (!phone || (!text && !msg.message && !mediaUrl && !msg.type)) {
    await logWebhook(sb, {
      userId: instance.user_id,
      instanceId,
      endpoint: `webhook/${event}`,
      payload,
      response: { received: true, event: 'unknown', stage: 'empty_message' },
      status: 200,
    })
    return jsonResponse({ received: true, event: 'unknown' })
  }

  if (messageId) {
    const { data: existing } = await sb
      .from('whatsapp_messages')
      .select('id')
      .eq('message_id', messageId)
      .maybeSingle()
    if (existing) {
      console.log('[receive-webhook] Duplicate message, skipping:', messageId)
      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId,
        endpoint: `webhook/${event}`,
        payload,
        response: { received: true, duplicate: true, messageId, stage: 'duplicate_check' },
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
      console.error('[receive-webhook] Message persistence failed:', insertError.message)
      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId,
        endpoint: `webhook/${event}`,
        payload,
        response: { error: insertError.message, stage: 'message_persistence' },
        status: 500,
      })
      return jsonResponse({ error: 'Erro ao salvar mensagem', stage: 'message_persistence' }, 500)
    }

    console.log('[receive-webhook] Message persisted successfully')

    if (!fromMe && phone) {
      console.log('[receive-webhook] Auto-creating contact for inbound message from:', phone)
      const contactName = msg.pushName || msg.senderName || msg.name || ''
      const contactPhoto = msg.profilePicUrl || msg.photoUrl || null
      await autoCreateContact(sb, {
        userId: instance.user_id,
        phone,
        name: contactName,
        photoUrl: contactPhoto,
      })
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
    return jsonResponse({ received: true, event: 'message', messageId, direction, type })
  } catch (err: any) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[receive-webhook] Unhandled error:', errorMsg)
    await logWebhook(sb, {
      userId: instance.user_id,
      instanceId,
      endpoint: `webhook/${event}`,
      payload,
      response: { error: errorMsg, stage: 'unhandled_error' },
      status: 500,
    })
    return jsonResponse({ received: true, error: 'Internal error', stage: 'unhandled_error' }, 500)
  }
})
