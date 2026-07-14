import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse, getAuthContext, callZapi, logApiCall } from '../_shared/zapi.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { user, sb, instance, error } = await getAuthContext(req)
  if (!user) return jsonResponse({ error }, 401)
  if (!instance) return jsonResponse({ error: 'Instância Z-API não configurada' }, 404)

  const body = await req.json()
  const { to, mediaType, mediaUrl, caption, filename, lat, lng, name, contactPhone } = body
  if (!to || !mediaType) {
    return jsonResponse({ error: 'Parâmetros "to" e "mediaType" são obrigatórios' }, 400)
  }

  const endpointMap: Record<string, string> = {
    image: '/send-image',
    document: '/send-document',
    audio: '/send-audio',
    video: '/send-video',
    location: '/send-location',
    contact: '/send-contact',
  }

  const endpoint = endpointMap[mediaType]
  if (!endpoint) return jsonResponse({ error: `mediaType inválido: ${mediaType}` }, 400)

  const payloadMap: Record<string, any> = {
    image: { phone: to, image: mediaUrl, caption: caption || '' },
    document: { phone: to, document: mediaUrl, fileName: filename || 'document' },
    audio: { phone: to, audio: mediaUrl },
    video: { phone: to, video: mediaUrl, caption: caption || '' },
    location: { phone: to, lat, lng, name: name || '' },
    contact: { phone: to, contactName: name, contactPhone },
  }

  const result = await callZapi(
    instance.instance_id,
    instance.instance_token,
    instance.client_token,
    endpoint,
    'POST',
    payloadMap[mediaType],
  )

  await logApiCall(sb, user.id, instance.instance_id, endpoint, body, result.data, result.status)

  if (result.ok && result.data?.messageId) {
    await sb.from('whatsapp_messages').insert({
      user_id: user.id,
      instance_id: instance.instance_id,
      message_id: result.data.messageId,
      chat_id: to,
      phone: to,
      direction: 'outgoing',
      type: mediaType,
      text: caption || filename || '',
      media_url: mediaUrl,
      status: 'sent',
    })
  }

  return jsonResponse({ success: result.ok, data: result.data })
})
