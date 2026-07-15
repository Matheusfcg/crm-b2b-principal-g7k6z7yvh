import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/zapi.ts'
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  )

  const reqHeaders = Object.fromEntries(req.headers.entries())
  console.log('[zapi-webhook] === Webhook received ===')
  console.log('[zapi-webhook] Request headers:', JSON.stringify(reqHeaders, null, 2))

  let payload: any = null
  try {
    payload = await req.json()
    console.log('[zapi-webhook] Webhook body:', JSON.stringify(payload, null, 2))
  } catch {
    console.error('[zapi-webhook] Invalid JSON payload')
    await logWebhook(sb, {
      userId: null,
      instanceId: null,
      endpoint: 'webhook',
      payload: null,
      response: { error: 'Invalid JSON payload', stage: 'json_parse' },
      status: 200,
    })
    return jsonResponse({ received: true, error: 'Invalid JSON payload' }, 200)
  }

  try {
    const event = payload.event || payload.type || ''

    const xInstanceIdHeader = req.headers.get('x-instance-id')
    const dataInstance =
      payload.data?.instance || payload.data?.instanceId || payload.data?.instance_id
    const instanceId =
      payload.instance ||
      payload.instanceId ||
      payload.instance_id ||
      dataInstance ||
      xInstanceIdHeader
    const instanceField = payload.instance
      ? 'body.instance'
      : payload.instanceId
        ? 'body.instanceId'
        : payload.instance_id
          ? 'body.instance_id'
          : dataInstance
            ? 'body.data.instance'
            : xInstanceIdHeader
              ? 'x-instance-id header'
              : null

    console.log(
      '[zapi-webhook] Instance identification - field:',
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
      return jsonResponse({ received: true, error: 'Instance não identificado' }, 200)
    }

    console.log(
      `[zapi-webhook] DB lookup: SELECT id, user_id, webhook_token, instance_id, instance_token, client_token, phone, status FROM whatsapp_instances WHERE instance_id = '${instanceId}' AND provider = 'z-api'`,
    )
    const { data: instance, error: dbError } = await sb
      .from('whatsapp_instances')
      .select(
        'id, user_id, webhook_token, instance_id, instance_token, client_token, phone, status',
      )
      .eq('instance_id', instanceId)
      .eq('provider', 'z-api')
      .maybeSingle()

    if (dbError) {
      console.error('[zapi-webhook] Database lookup error:', dbError.message)
      await logWebhook(sb, {
        userId: null,
        instanceId,
        endpoint: `webhook/${event}`,
        payload,
        response: { error: dbError.message, stage: 'database_lookup' },
        status: 200,
      })
      return jsonResponse({ received: true, error: 'Database lookup error' }, 200)
    }

    if (!instance) {
      console.log(
        `[zapi-webhook] Instance NOT FOUND — Value "${instanceId}" not found in column "instance_id" with provider filter "z-api"`,
      )
      await logWebhook(sb, {
        userId: null,
        instanceId,
        endpoint: `webhook/${event}`,
        payload,
        response: {
          error: 'Instance não identificado',
          stage: 'instance_not_found',
          searchedColumn: 'instance_id',
          searchedValue: instanceId,
          providerFilter: 'z-api',
        },
        status: 200,
      })
      return jsonResponse({ received: true, error: 'Instance não identificado' }, 200)
    }

    console.log('[zapi-webhook] Instance found:', instance.id, '| user:', instance.user_id)

    if (instance.webhook_token) {
      const providedToken = req.headers.get('webhook-token') || payload.webhookToken
      if (providedToken !== instance.webhook_token) {
        console.log('[zapi-webhook] Invalid webhook token')
        await logWebhook(sb, {
          userId: instance.user_id,
          instanceId: instance.instance_id,
          endpoint: `webhook/${event}`,
          payload,
          response: { error: 'Token do webhook inválido', stage: 'token_validation' },
          status: 403,
        })
        return jsonResponse({ error: 'Token do webhook inválido' }, 403)
      }
      console.log('[zapi-webhook] Webhook token validated')
    } else {
      console.log('[zapi-webhook] No webhook token configured, proceeding without validation')
    }

    const msg = payload.data || payload

    if (
      CONNECTION_EVENTS.includes(event) ||
      event.includes('connection') ||
      event.includes('status')
    ) {
      console.log('[zapi-webhook] Processing connection event:', event)
      const connected = msg.connected ?? msg.status === 'connected' ?? msg.state === 'CONNECTED'

      const { error: updErr } = await sb
        .from('whatsapp_instances')
        .update({
          status: connected ? 'connected' : 'disconnected',
          phone: msg.phone || msg.number || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id)

      if (updErr) console.error('[zapi-webhook] Failed to update instance status:', updErr.message)

      if (connected) {
        console.log('[zapi-webhook] Instance connected, initiating conversation sync')
        await syncConversations(sb, {
          instance_id: instance.instance_id,
          instance_token: instance.instance_token,
          client_token: instance.client_token,
          user_id: instance.user_id,
        })
      }

      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId: instance.instance_id,
        endpoint: `webhook/${event}`,
        payload,
        response: { received: true, event: 'connection', connected },
        status: 200,
      })
      return jsonResponse({ received: true, event: 'connection', connected })
    }

    const isMessageEvent =
      MESSAGE_EVENTS.includes(event) ||
      (msg.messageId &&
        (msg.text || msg.message || msg.mediaUrl || msg.type || msg.extendedTextMessage))

    if (!isMessageEvent) {
      console.log('[zapi-webhook] Unknown event type:', event)
      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId: instance.instance_id,
        endpoint: `webhook/${event}`,
        payload,
        response: { received: true, event: 'unknown', eventType: event },
        status: 200,
      })
      return jsonResponse({ received: true, event: 'unknown', eventType: event })
    }

    console.log('[zapi-webhook] Processing message event:', event)
    const messageId = extractMessageId(msg)
    const phone = extractPhone(msg)
    const text = extractText(msg)
    const type = normalizeType(msg)
    const fromMe = msg.fromMe ?? false
    const direction = fromMe ? 'outbound' : 'inbound'
    const mediaUrl = msg.mediaUrl || msg.url || msg.fileUrl || null

    console.log(
      '[zapi-webhook] Message - id:',
      messageId,
      '| phone:',
      phone,
      '| dir:',
      direction,
      '| type:',
      type,
    )

    if (messageId) {
      const { data: existing } = await sb
        .from('whatsapp_messages')
        .select('id')
        .eq('message_id', messageId)
        .maybeSingle()
      if (existing) {
        console.log('[zapi-webhook] Duplicate message, skipping:', messageId)
        await logWebhook(sb, {
          userId: instance.user_id,
          instanceId: instance.instance_id,
          endpoint: `webhook/${event}`,
          payload,
          response: { received: true, duplicate: true, messageId, stage: 'duplicate_check' },
          status: 200,
        })
        return jsonResponse({ received: true, duplicate: true, messageId })
      }
    }

    const { error: insertError } = await sb.from('whatsapp_messages').insert({
      user_id: instance.user_id,
      instance_id: instance.instance_id,
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
      console.error('[zapi-webhook] Message persistence failed:', insertError.message)
      await logWebhook(sb, {
        userId: instance.user_id,
        instanceId: instance.instance_id,
        endpoint: `webhook/${event}`,
        payload,
        response: { error: insertError.message, stage: 'message_persistence' },
        status: 200,
      })
      return jsonResponse(
        { received: true, error: 'Database insert failed', stage: 'message_persistence' },
        200,
      )
    }

    console.log('[zapi-webhook] Message persisted successfully')

    if (!fromMe && phone) {
      console.log('[zapi-webhook] Auto-creating contact for inbound message from:', phone)
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
      instanceId: instance.instance_id,
      endpoint: `webhook/${event}`,
      payload,
      response: { received: true, event: 'message', messageId, direction, type },
      status: 200,
    })
    return jsonResponse({ received: true, event: 'message', messageId, direction, type })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error('[zapi-webhook] Unhandled error:', errorMsg)
    await logWebhook(sb, {
      userId: null,
      instanceId: payload?.instance || payload?.instanceId || payload?.instance_id || null,
      endpoint: `webhook/${payload?.event || payload?.type || 'unknown'}`,
      payload,
      response: { error: errorMsg, stage: 'unhandled_error' },
      status: 200,
    })
    return jsonResponse({ received: true, error: 'Internal error', stage: 'unhandled_error' }, 200)
  }
})
