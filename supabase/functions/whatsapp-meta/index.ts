import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { processProposalAutomation } from '../_shared/automation.ts'

const ALLOWED_ORIGINS = [
  'https://crm-b2b-principal-462cb--preview.goskip.app',
  'https://crm-vexa.goskip.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
]

const BASE_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

function getCors(req: Request) {
  const origin = req.headers.get('Origin')
  return {
    ...BASE_CORS_HEADERS,
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*',
  }
}

async function verifySig(rawBody: string, sig: string | null, secret: string): Promise<boolean> {
  if (!sig || !secret || !sig.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computed = 'sha256=' + Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return sig === computed
}

async function ensureInstance(sb: any, userId: string, phoneNumberId: string) {
  const { data: existing } = await sb
    .from('whatsapp_instances')
    .select('id, instance_name')
    .eq('user_id', userId)
    .ilike('instance_name', 'meta_%')
    .order('created_at', { ascending: false })
    .limit(1)

  const inst = existing && existing.length > 0 ? existing[0] : null

  if (inst) {
    const desiredName = `meta_${phoneNumberId}`
    if (inst.instance_name !== desiredName) {
      const { data: updated } = await sb
        .from('whatsapp_instances')
        .update({
          instance_name: desiredName,
          status: 'connected',
          server_url: 'https://graph.facebook.com',
          updated_at: new Date().toISOString(),
        })
        .eq('id', inst.id)
        .select('id, user_id')
        .single()
      return updated
    }
    return inst
  }

  const { data: newInst } = await sb
    .from('whatsapp_instances')
    .insert({
      user_id: userId,
      instance_name: `meta_${phoneNumberId}`,
      instance_token: 'meta_cloud_api',
      server_url: 'https://graph.facebook.com',
      status: 'connected',
    })
    .select('id, user_id')
    .single()

  return newInst
}

async function resolveMediaUrl(mediaId: string, accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.url || null
  } catch {
    return null
  }
}

async function processWebhook(body: any, sb: any) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value
      if (!value || value.messaging_product !== 'whatsapp') continue
      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) continue

      const { data: config, error: configError } = await sb
        .from('configuracoes_whatsapp')
        .select('user_id, access_token')
        .eq('phone_number_id', phoneNumberId)
        .maybeSingle()

      if (configError) {
        console.error('Error querying configuracoes_whatsapp:', configError.message)
      }

      if (!config) {
        console.error('Configuração não encontrada para o Phone Number ID:', phoneNumberId)
        continue
      }

      const instance = await ensureInstance(sb, config.user_id, phoneNumberId)
      if (!instance) {
        console.error('Failed to ensure instance for user:', config.user_id)
        continue
      }

      for (const st of value.statuses || []) {
        if (st.id) {
          await sb.from('messages').update({ status: st.status }).eq('message_id', st.id)
        }
      }

      const contactsInfo = value.contacts || []
      for (const msg of value.messages || []) {
        const from = msg.from
        if (!from) continue
        const contactInfo = contactsInfo.find((c: any) => c.wa_id === from)
        const pushName = contactInfo?.profile?.name || from

        const { data: contact } = await sb
          .from('contacts')
          .upsert(
            { instance_id: instance.id, remote_jid: from, push_name: pushName },
            { onConflict: 'instance_id,remote_jid' },
          )
          .select('id')
          .single()
        if (!contact) continue

        let content = msg.type === 'text' ? (msg.text?.body || '') : ''
        let mediaUrl: string | null = null
        let mediaFilename: string | null = null
        let mediaMimetype: string | null = null

        if (msg.type === 'image') {
          content = msg.image?.caption || ''
          mediaMimetype = msg.image?.mime_type || 'image/jpeg'
          if (msg.image?.id && config?.access_token) {
            mediaUrl = await resolveMediaUrl(msg.image.id, config.access_token)
          }
        } else if (msg.type === 'audio') {
          mediaMimetype = msg.audio?.mime_type || 'audio/ogg'
          if (msg.audio?.id && config?.access_token) {
            mediaUrl = await resolveMediaUrl(msg.audio.id, config.access_token)
          }
        } else if (msg.type === 'document') {
          content = msg.document?.caption || ''
          mediaFilename = msg.document?.filename || 'Documento'
          mediaMimetype = msg.document?.mime_type || 'application/octet-stream'
          if (msg.document?.id && config?.access_token) {
            mediaUrl = await resolveMediaUrl(msg.document.id, config.access_token)
          }
        } else if (msg.type === 'video') {
          content = msg.video?.caption || ''
          mediaMimetype = msg.video?.mime_type || 'video/mp4'
          if (msg.video?.id && config?.access_token) {
            mediaUrl = await resolveMediaUrl(msg.video.id, config.access_token)
          }
        } else if (msg.type === 'sticker') {
          if (msg.sticker?.id && config?.access_token) {
            mediaUrl = await resolveMediaUrl(msg.sticker.id, config.access_token)
          }
        }

        const ts = msg.timestamp
          ? new Date(Number(msg.timestamp) * 1000).toISOString()
          : new Date().toISOString()

        const { data: conv } = await sb
          .from('conversations')
          .upsert(
            {
              instance_id: instance.id,
              contact_id: contact.id,
              last_message: (content || (msg.type && msg.type !== 'text' ? msg.type : 'Mensagem')).substring(0, 255),
              updated_at: ts,
            },
            { onConflict: 'instance_id,contact_id' },
          )
          .select('id, unread_count')
          .single()
        if (!conv) continue

        await sb
        .from('messages')
        .upsert(
          {
            conversation_id: conv.id,
            message_id: msg.id,
            from_me: false,
            content,
            type: msg.type || 'text',
            timestamp: ts,
            status: 'received',
            media_url: mediaUrl,
            media_filename: mediaFilename,
            media_mimetype: mediaMimetype,
          },
          { onConflict: 'message_id' },
        )
        await sb
          .from('conversations')
          .update({ unread_count: (conv.unread_count || 0) + 1 })
          .eq('id', conv.id)
          
        await processProposalAutomation(sb, from, content, instance.user_id)
      }
    }
  }
}

async function handleSend(body: any, sb: any, ch: Record<string, string>) {
  const { instanceId, to, text, mediaType, mediaUrl, mediaFilename } = body
  if (!instanceId || !to || (!text && !mediaUrl)) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...ch },
    })
  }

  const { data: instance } = await sb
    .from('whatsapp_instances')
    .select('user_id')
    .eq('id', instanceId)
    .single()

  if (!instance) {
    return new Response(JSON.stringify({ error: 'Instance not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...ch },
    })
  }

  const { data: config } = await sb
    .from('configuracoes_whatsapp')
    .select('phone_number_id, access_token')
    .eq('user_id', instance.user_id)
    .single()

  if (!config) {
    return new Response(JSON.stringify({ error: 'Meta config not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...ch },
    })
  }

  const payload: any = { messaging_product: 'whatsapp', recipient_type: 'individual', to }
  if (mediaUrl && mediaType) {
    payload.type = mediaType
    if (mediaType === 'image') payload.image = { link: mediaUrl, caption: text || undefined }
    else if (mediaType === 'audio') payload.audio = { link: mediaUrl }
    else if (mediaType === 'document') payload.document = { link: mediaUrl, filename: mediaFilename || 'document', caption: text || undefined }
    else if (mediaType === 'video') payload.video = { link: mediaUrl, caption: text || undefined }
    else { payload.type = 'text'; payload.text = { body: text || '' } }
  } else {
    payload.type = 'text'
    payload.text = { body: text || '' }
  }

  const res = await fetch(`https://graph.facebook.com/v19.0/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    return new Response(
      JSON.stringify({ error: `Meta API error (${res.status})`, details: errText }),
      { status: res.status, headers: { 'Content-Type': 'application/json', ...ch } },
    )
  }

  const data = await res.json()
  const messageId = data.messages?.[0]?.id || `sent_${Date.now()}`

  await sb.from('whatsapp_logs').insert({
    endpoint: `graph.facebook.com/v19.0/${config.phone_number_id}/messages`,
    payload: payload,
    response: data,
    user_id: instance.user_id,
  })

  const { data: contact } = await sb
    .from('contacts')
    .select('id')
    .eq('instance_id', instanceId)
    .eq('remote_jid', to)
    .maybeSingle()

  if (contact) {
    const { data: conv } = await sb
      .from('conversations')
      .select('id')
      .eq('instance_id', instanceId)
      .eq('contact_id', contact.id)
      .maybeSingle()

    if (conv) {
      const msgType = mediaType || 'text'
      await sb.from('messages').upsert(
        {
          conversation_id: conv.id,
          message_id: messageId,
          from_me: true,
          content: text || '',
          type: msgType,
          timestamp: new Date().toISOString(),
          status: 'sent',
          media_url: mediaUrl || null,
          media_filename: mediaFilename || null,
        },
        { onConflict: 'message_id' },
      )
      const lastMsgPreview = mediaUrl
        ? (msgType === 'image' ? '📷 Imagem' : msgType === 'audio' ? '🎵 Áudio' : msgType === 'document' ? '📄 Documento' : msgType === 'video' ? '🎬 Vídeo' : '📎 Mídia')
        : text.substring(0, 255)
      await sb
        .from('conversations')
        .update({
          last_message: lastMsgPreview,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conv.id)

      await processProposalAutomation(sb, to, text || '', instance.user_id)
    }
  }

  return new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json', ...ch },
  })
}

async function handleEmbeddedSignup(body: any, sb: any, ch: Record<string, string>) {
  const { accessToken, userId } = body
  if (!accessToken || !userId) {
    return new Response(JSON.stringify({ error: 'Missing access token or user ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...ch },
    })
  }

  try {
    const appId = '2113443072550231'
    const appSecret = Deno.env.get('META_APP_SECRET') || ''
    
    let finalToken = accessToken
    if (appSecret) {
      const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`)
      if (tokenRes.ok) {
        const tokenData = await tokenRes.json()
        if (tokenData.access_token) {
          finalToken = tokenData.access_token
        }
      }
    }

    let wabaId = null
    let phoneNumberId = null

    const bizRes = await fetch(`https://graph.facebook.com/v19.0/me/businesses`, {
      headers: { Authorization: `Bearer ${finalToken}` }
    })
    
    if (bizRes.ok) {
      const bizData = await bizRes.json()
      if (bizData.data) {
        for (const biz of bizData.data) {
          const ownedRes = await fetch(`https://graph.facebook.com/v19.0/${biz.id}/owned_whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number}`, {
            headers: { Authorization: `Bearer ${finalToken}` }
          })
          const ownedData = ownedRes.ok ? await ownedRes.json() : { data: [] }
          
          if (ownedData.data && ownedData.data.length > 0) {
            const waba = ownedData.data[0]
            const phones = waba.phone_numbers?.data
            if (phones && phones.length > 0) {
              wabaId = waba.id
              phoneNumberId = phones[0].id
              break
            }
          }
          
          if (wabaId) break

          const clientRes = await fetch(`https://graph.facebook.com/v19.0/${biz.id}/client_whatsapp_business_accounts?fields=id,name,phone_numbers{id,display_phone_number}`, {
            headers: { Authorization: `Bearer ${finalToken}` }
          })
          const clientData = clientRes.ok ? await clientRes.json() : { data: [] }
          
          if (clientData.data && clientData.data.length > 0) {
            const waba = clientData.data[0]
            const phones = waba.phone_numbers?.data
            if (phones && phones.length > 0) {
              wabaId = waba.id
              phoneNumberId = phones[0].id
              break
            }
          }
          if (wabaId) break
        }
      }
    }

    if (!wabaId || !phoneNumberId) {
      return new Response(JSON.stringify({ error: 'Nenhuma conta do WhatsApp Business associada com um número de telefone foi encontrada no seu perfil. Verifique as permissões concedidas.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...ch },
      })
    }

    const { data: existing, error: existingErr } = await sb
      .from('configuracoes_whatsapp')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingErr) {
      return new Response(JSON.stringify({ error: `Erro ao buscar configuração: ${existingErr.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...ch },
      })
    }

    let configError = null
    if (existing) {
      const { error: updateErr } = await sb.from('configuracoes_whatsapp').update({
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        access_token: finalToken,
      }).eq('id', existing.id)
      configError = updateErr
    } else {
      const { error: insertErr } = await sb.from('configuracoes_whatsapp').insert({
        user_id: userId,
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        access_token: finalToken,
      })
      configError = insertErr
    }

    if (configError) {
      return new Response(JSON.stringify({ error: `Erro ao salvar configuração: ${configError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...ch },
      })
    }

    const instance = await ensureInstance(sb, userId, phoneNumberId)
    if (!instance) {
      return new Response(JSON.stringify({ error: 'Falha ao criar instância do WhatsApp.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...ch },
      })
    }

    return new Response(JSON.stringify({ success: true, wabaId, phoneNumberId }), {
      headers: { 'Content-Type': 'application/json', ...ch },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...ch },
    })
  }
}

Deno.serve(async (req: Request) => {
  const ch = getCors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ch })

  const sb = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  )

  if (req.method === 'GET') {
    const u = new URL(req.url)
    if (
      u.searchParams.get('hub.mode') === 'subscribe' &&
      u.searchParams.get('hub.verify_token') === (Deno.env.get('META_VERIFY_TOKEN') || '')
    ) {
      return new Response(u.searchParams.get('hub.challenge') || '', {
        status: 200,
        headers: { 'Content-Type': 'text/plain', ...ch },
      })
    }
    return new Response('Forbidden', { status: 403, headers: ch })
  }

  const rawBody = await req.text()
  let body: any = {}
  try {
    body = JSON.parse(rawBody)
  } catch {}

  if (body.object === 'whatsapp_business_account' || req.headers.get('X-Hub-Signature-256')) {
    if (
      !await verifySig(
        rawBody,
        req.headers.get('X-Hub-Signature-256'),
        Deno.env.get('META_APP_SECRET') || '',
      )
    ) {
      return new Response('Unauthorized', { status: 401, headers: ch })
    }
    try {
      await processWebhook(body, sb)
    } catch (err) {
      console.error('Webhook processing error:', err)
    }
    return new Response('OK', { status: 200, headers: ch })
  }

  if (body.action === 'send_message') return await handleSend(body, sb, ch)

  if (body.action === 'setup_embedded_signup') {
    return await handleEmbeddedSignup(body, sb, ch)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', ...ch },
  })
})
