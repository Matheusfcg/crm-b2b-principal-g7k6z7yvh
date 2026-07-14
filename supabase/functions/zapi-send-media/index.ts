import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse, getAuthContext, callZapi, logApiCall } from '../_shared/zapi.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { user, sb, instance, error } = await getAuthContext(req)
  if (!user) return jsonResponse({ error }, 401)
  if (!instance) return jsonResponse({ error: 'Instância Z-API não configurada' }, 404)

  const body = await req.json()
  const { to, mediaType, mediaUrl, caption, filename, lat, lng, name, contactPhone } = body
  if (!to) return jsonResponse({ error: 'Parâmetro "to" é obrigatório' }, 400)

  let endpoint = ''
  const payload: any = { phone: to }
  let type = mediaType

  switch (mediaType) {
    case 'image':
      endpoint = '/send-image'
      payload.image = mediaUrl
      if (caption) payload.caption = caption
      break
    case 'document':
      endpoint = '/send-document'
      payload.document = mediaUrl
      if (filename) payload.fileName = filename
      break
    case 'audio':
      endpoint = '/send-audio'
      payload.audio = mediaUrl
      break
    case 'video':
      endpoint = '/send-video'
      payload.video = mediaUrl
      if (caption) payload.caption = caption
      break
    case 'location':
      endpoint = '/send-location'
      payload.lat = lat
      payload.lng = lng
      if (name) payload.title = name
      type = 'location'
      break
    case 'contact':
      endpoint = '/send-contact'
      payload.contact = { name: name || '', phone: contactPhone || '' }
      type = 'contact'
      break
    default:
      return jsonResponse({ error: 'Tipo de mídia não suportado' }, 400)
  }

  const result = await callZapi(
    instance.instance_id,
    instance.instance_token,
    instance.client_token,
    endpoint,
    'POST',
    payload,
  )
  await logApiCall(sb, user.id, instance.instance_id, endpoint, payload, result.data, result.status)

  if (result.ok && result.data?.messageId) {
    await sb.from('whatsapp_messages').insert({
      user_id: user.id,
      instance_id: instance.instance_id,
      message_id: result.data.messageId,
      chat_id: to,
      phone: to,
      direction: 'outgoing',
      type,
      text: caption || '',
      media_url: mediaUrl || null,
      status: 'sent',
    })
  }

  return jsonResponse({ success: result.ok, data: result.data })
})
