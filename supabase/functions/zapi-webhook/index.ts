import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/zapi.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  )

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: true })
  }

  const url = new URL(req.url)
  const pathSegments = url.pathname.split('/').filter(Boolean)
  const urlInstanceId = pathSegments.length > 1 ? pathSegments[pathSegments.length - 1] : null
  const instanceId = body.instance || body.instanceId || body.instance_id || urlInstanceId
  if (!instanceId) return jsonResponse({ success: true })

  const { data: instance } = await sb
    .from('whatsapp_instances')
    .select('id, user_id, instance_id, webhook_token')
    .eq('instance_id', instanceId)
    .eq('provider', 'z-api')
    .maybeSingle()

  if (!instance) return jsonResponse({ success: true })

  if (instance.webhook_token) {
    const token = req.headers.get('webhook-token') || url.searchParams.get('token')
    if (token && token !== instance.webhook_token)
      return jsonResponse({ error: 'Invalid token' }, 401)
  }

  const event = body.event || ''
  const data = body.data || body

  try {
    if (event.includes('connection') || (data.connected !== undefined && !data.messageId)) {
      const connected = data.connected ?? data.state === 'open'
      await sb
        .from('whatsapp_instances')
        .update({
          connected: !!connected,
          status: connected ? 'connected' : 'disconnected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id)
    } else if (data.messageId || data.phone || event.includes('message')) {
      await handleMessage(sb, instance, data)
    }
  } catch (err) {
    console.error('Webhook error:', err)
  }

  return jsonResponse({ success: true })
})

async function handleMessage(sb: any, instance: any, msg: any) {
  const phone = msg.phone || msg.from || ''
  const messageId = msg.messageId || msg.id || `msg_${Date.now()}`
  if (!phone) return

  const typeMap: Record<string, string> = {
    texto: 'text',
    text: 'text',
    imagem: 'image',
    image: 'image',
    documento: 'document',
    document: 'document',
    áudio: 'audio',
    audio: 'audio',
    vídeo: 'video',
    video: 'video',
    sticker: 'sticker',
    localização: 'location',
    location: 'location',
    contato: 'contact',
    contact: 'contact',
  }
  const normalizedType = typeMap[(msg.type || 'text').toLowerCase()] || 'text'

  let text = ''
  let mediaUrl: string | null = null

  if (normalizedType === 'text') text = msg.text || msg.message || ''
  else if (normalizedType === 'image') {
    text = msg.caption || ''
    mediaUrl = msg.url || msg.image?.url || ''
  } else if (normalizedType === 'document') {
    text = msg.fileName || ''
    mediaUrl = msg.url || msg.document?.url || ''
  } else if (normalizedType === 'audio') {
    mediaUrl = msg.url || msg.audio?.url || ''
  } else if (normalizedType === 'video') {
    text = msg.caption || ''
    mediaUrl = msg.url || msg.video?.url || ''
  } else if (normalizedType === 'sticker') {
    mediaUrl = msg.url || msg.sticker?.url || ''
  } else if (normalizedType === 'location') {
    text = JSON.stringify({ lat: msg.lat, lng: msg.lng, name: msg.name })
  } else if (normalizedType === 'contact') {
    text = JSON.stringify({ name: msg.name, phone: msg.phone })
  } else text = msg.text || ''

  const fromMe = msg.fromMe ?? false
  const status = msg.status || (fromMe ? 'sent' : 'received')

  const { data: existing } = await sb
    .from('whatsapp_messages')
    .select('id')
    .eq('message_id', messageId)
    .maybeSingle()
  if (existing) {
    await sb.from('whatsapp_messages').update({ status }).eq('id', existing.id)
  } else {
    await sb.from('whatsapp_messages').insert({
      user_id: instance.user_id,
      instance_id: instance.instance_id,
      message_id: messageId,
      chat_id: phone,
      phone,
      direction: fromMe ? 'outgoing' : 'incoming',
      type: normalizedType,
      text,
      media_url: mediaUrl,
      status,
    })
  }
}
