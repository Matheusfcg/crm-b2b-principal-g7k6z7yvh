import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const allowedOrigins = [
  'https://crm-b2b-principal-462cb--preview.goskip.app',
  'https://crm-vexa.goskip.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
]

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin')
  const isAllowed = origin && allowedOrigins.includes(origin)
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let body: any = {}
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        body = await req.json()
        console.log('Incoming request body:', body)
      } catch (e: any) {
        console.warn('Request body is not valid JSON or empty:', e.message)
      }
    }

    const url = new URL(req.url)
    console.log('[Webhook URL]', url.pathname)

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Handle Webhooks from Uazapi
    const urlEvent = url.pathname.includes('/whatsapp-uazapi/')
      ? url.pathname.split('/whatsapp-uazapi/')[1]?.replace(/\//g, '.')
      : null

    const isWebhook =
      (body.event && body.instance) || (urlEvent && (body.instance || body.instanceName || body.id))

    if (isWebhook || req.method === 'POST') {
      const event = body.event || urlEvent
      const instanceName = body.instance || body.instanceName || url.pathname.split('/').pop()
      const data = body.data || body

      // If it looks like a webhook payload
      if (event && instanceName) {
        console.log(`[Webhook Event] ${event} for instance ${instanceName}`)

        const { data: inst } = await supabase
          .from('whatsapp_instances')
          .select('id')
          .eq('instance_name', instanceName)
          .single()

        if (!inst) {
          console.warn(`[Webhook] Instance not found: ${instanceName}`)
          // We must return 200 OK so Uazapi stops retrying if instance was deleted
          return new Response('Instance not found', { status: 200, headers: corsHeaders })
        }

        try {
          if (
            event === 'qrcode.updated' ||
            event === 'connection.update' ||
            event.includes('connection')
          ) {
            const qrData = data?.qrcode?.base64 || data?.base64 || data?.qrcode || body.qrcode
            const stateData = data?.state || data?.status || body.state || body.status

            const updatePayload: any = { updated_at: new Date().toISOString() }

            if (qrData && typeof qrData === 'string') {
              updatePayload.qrcode = qrData
              updatePayload.status = 'qrcode'
            } else if (stateData) {
              const state = String(stateData).toLowerCase()
              const statusMap: Record<string, string> = {
                open: 'connected',
                close: 'disconnected',
                connecting: 'connecting',
              }
              updatePayload.status = statusMap[state] || state
            }

            if (Object.keys(updatePayload).length > 1) {
              await supabase.from('whatsapp_instances').update(updatePayload).eq('id', inst.id)
            }
          }

          if (
            event === 'messages.upsert' ||
            event === 'messages.update' ||
            event === 'messages' ||
            event.includes('message')
          ) {
            const msgs = Array.isArray(data) ? data : data?.messages ? data.messages : [data]

            for (const msg of msgs) {
              if (!msg) continue

              const remoteJid = msg.key?.remoteJid || msg.remoteJid || msg.id
              if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast')
                continue

              const fromMe = msg.key?.fromMe || msg.fromMe || false
              const messageId = msg.key?.id || msg.messageId || msg.id
              const pushName = msg.pushName || ''

              let content = ''
              if (msg.message?.conversation) content = msg.message.conversation
              else if (msg.message?.extendedTextMessage?.text)
                content = msg.message.extendedTextMessage.text
              else if (msg.message?.imageMessage?.caption)
                content = msg.message.imageMessage.caption || 'Imagem'
              else if (msg.text) content = msg.text
              else content = 'Mensagem de mídia/outro'

              const timestamp = msg.messageTimestamp
                ? new Date(Number(msg.messageTimestamp) * 1000).toISOString()
                : new Date().toISOString()

              // 1. Ensure contact
              const { data: contact } = await supabase
                .from('contacts')
                .upsert(
                  {
                    instance_id: inst.id,
                    remote_jid: remoteJid,
                    push_name: pushName,
                  },
                  { onConflict: 'instance_id,remote_jid' },
                )
                .select('id')
                .single()

              if (contact && messageId) {
                // 2. Ensure conversation
                const { data: conv } = await supabase
                  .from('conversations')
                  .upsert(
                    {
                      instance_id: inst.id,
                      contact_id: contact.id,
                      last_message: content.substring(0, 255),
                      updated_at: timestamp,
                    },
                    { onConflict: 'instance_id,contact_id' },
                  )
                  .select('id')
                  .single()

                if (conv) {
                  // 3. Insert message
                  await supabase.from('messages').upsert(
                    {
                      conversation_id: conv.id,
                      message_id: messageId,
                      from_me: fromMe,
                      content: content,
                      type: 'text',
                      timestamp: timestamp,
                      status: 'received',
                    },
                    { onConflict: 'message_id' },
                  )
                }
              }
            }
          }

          if (
            event === 'contacts.upsert' ||
            event === 'contacts.update' ||
            event === 'contacts' ||
            event.includes('contact')
          ) {
            const contacts = Array.isArray(data) ? data : [data]
            for (const c of contacts) {
              if (!c) continue
              const remoteJid = c.id || c.remoteJid
              if (!remoteJid) continue
              const pushName = c.name || c.pushName || c.notify || ''
              const profilePic = c.profilePictureUrl || c.profilePic || null

              await supabase.from('contacts').upsert(
                {
                  instance_id: inst.id,
                  remote_jid: remoteJid,
                  push_name: pushName,
                  profile_picture: profilePic,
                },
                { onConflict: 'instance_id,remote_jid' },
              )
            }
          }
        } catch (err) {
          console.error('Webhook processing error:', err)
        }

        // Always return 200 OK immediately for webhooks
        return new Response('OK', { status: 200, headers: corsHeaders })
      }
    }

    const { action, instanceId, instanceName, remoteJid, text } = body

    if (!instanceId && !instanceName) {
      return new Response(
        JSON.stringify({ success: true, message: 'No instance provided, assuming health check' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      )
    }

    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq(instanceId ? 'id' : 'instance_name', instanceId || instanceName)
      .single()

    if (instanceError || !instance || !instance.instance_name) {
      console.error(
        'Instance fetch error or missing instance_name:',
        instanceError,
        'for id/name:',
        instanceId || instanceName,
      )
      return new Response(
        JSON.stringify({
          code: 'INSTANCE_NOT_FOUND',
          error: 'Instance not found or missing instance_name',
          details: instanceError,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const serverUrl = body.serverUrl || instance.server_url || 'https://apiwhatsvexaview.uazapi.com'
    const apikey = body.instanceToken || instance.instance_token

    if (!apikey) {
      return new Response(
        JSON.stringify({
          code: 'UAZAPI_TOKEN_MISSING',
          error: 'O token da instância não foi encontrado no banco nem enviado na requisição.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const callApi = async (endpoint: string, method: string = 'GET', payload?: any) => {
      if (!endpoint || endpoint.includes('undefined') || endpoint.includes('null')) {
        const err = new Error('Malformed API endpoint URL due to missing instance details')
        ;(err as any).status = 400
        throw err
      }

      const cleanServerUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl
      const apiUrl = `${cleanServerUrl}${endpoint}`

      console.log(`[Uazapi Request] URL: ${apiUrl} | Method: ${method}`)
      console.log(`[Uazapi Request] Headers:`, {
        'Content-Type': 'application/json',
        apikey: apikey ? `***${apikey.slice(-4)}` : 'MISSING',
      })
      if (payload) {
        console.log(`[Uazapi Request] Payload:`, JSON.stringify(payload))
      }

      const res = await fetch(apiUrl, {
        method,
        headers: { 'Content-Type': 'application/json', apikey },
        body: payload ? JSON.stringify(payload) : undefined,
      })

      console.log(`[Uazapi Response] Status: ${res.status} ${res.statusText}`)

      if (!res.ok) {
        const errorText = await res.text().catch(() => '')
        console.error(`[Uazapi Error] Endpoint returned ${res.status}:`, errorText)
        let parsedError
        try {
          parsedError = JSON.parse(errorText)
        } catch (e) {
          // ignore
        }

        if (res.status === 401 || res.status === 403) {
          const err = new Error('UNAUTHORIZED')
          ;(err as any).status = res.status
          ;(err as any).body = parsedError || errorText
          throw err
        }
        if (res.status === 429) {
          const err = new Error('RATE_LIMIT_REACHED')
          ;(err as any).status = 429
          ;(err as any).body = parsedError || errorText
          throw err
        }

        const err = new Error(
          `API Error (${res.status}): ${parsedError?.message || errorText || res.statusText}`,
        )
        ;(err as any).status = res.status
        ;(err as any).body = parsedError || errorText
        throw err
      }

      const textData = await res.text()
      const contentType = res.headers.get('content-type') || ''
      try {
        if (textData && textData.trim().length > 0) {
          if (contentType.includes('application/json')) {
            return JSON.parse(textData)
          } else {
            console.warn(`External API returned non-JSON content-type: ${contentType}`)
            return { success: res.ok, status: res.status, data: textData }
          }
        }
        return { success: res.ok, status: res.status }
      } catch (e: any) {
        const err = new Error(`JSON Parse Error: ${e.message}`)
        ;(err as any).status = 500
        throw err
      }
    }

    if (action === 'get_qr') {
      const data = await callApi(`/instance/connect/${instance.instance_name}`, 'GET')
      await supabase
        .from('whatsapp_instances')
        .update({
          qrcode: data?.base64 || null,
          status: 'qrcode',
        })
        .eq('id', instance.id)

      return new Response(
        JSON.stringify({ instance: { ...instance, qrcode: data?.base64, status: 'qrcode' } }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    if (action === 'get_status') {
      const data = await callApi(`/instance/connectionState/${instance.instance_name}`, 'GET')
      const state = data?.instance?.state || 'disconnected'
      await supabase
        .from('whatsapp_instances')
        .update({
          status: state === 'open' ? 'connected' : state,
        })
        .eq('id', instance.id)

      return new Response(
        JSON.stringify({
          state,
          instance: { ...instance, status: state === 'open' ? 'connected' : state },
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    if (action === 'send_message') {
      const data = await callApi(`/message/sendText/${instance.instance_name}`, 'POST', {
        number: remoteJid,
        text,
      })
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (action === 'get_conversations') {
      const chatsResponse = await callApi(`/chat/findChats/${instance.instance_name}`, 'POST', {})
      const chats = chatsResponse?.chats || chatsResponse?.data || chatsResponse || []

      if (Array.isArray(chats)) {
        for (const chat of chats) {
          const remoteJid = chat.id || chat.remoteJid
          if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast')
            continue

          const pushName = chat.name || chat.pushName || ''
          const profilePic = chat.profilePictureUrl || chat.profilePic || null

          const { data: contactData } = await supabase
            .from('contacts')
            .upsert(
              {
                instance_id: instance.id,
                remote_jid: remoteJid,
                push_name: pushName,
                profile_picture: profilePic,
              },
              { onConflict: 'instance_id,remote_jid' },
            )
            .select('id')
            .single()

          if (contactData) {
            const unreadCount = chat.unreadCount || 0
            let lastMsg = ''
            if (chat.lastMessage?.message?.conversation) {
              lastMsg = chat.lastMessage.message.conversation
            } else if (chat.lastMessage?.message?.extendedTextMessage?.text) {
              lastMsg = chat.lastMessage.message.extendedTextMessage.text
            } else {
              lastMsg = chat.lastMessage || ''
            }

            let timestamp = new Date().toISOString()
            if (chat.conversationTimestamp) {
              timestamp = new Date(Number(chat.conversationTimestamp) * 1000).toISOString()
            } else if (chat.updatedAt) {
              timestamp = new Date(chat.updatedAt).toISOString()
            }

            await supabase.from('conversations').upsert(
              {
                instance_id: instance.id,
                contact_id: contactData.id,
                last_message: typeof lastMsg === 'string' ? lastMsg.substring(0, 255) : '',
                unread_count: unreadCount,
                updated_at: timestamp,
              },
              { onConflict: 'instance_id,contact_id' },
            )
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Conversations sync completed successfully' }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    return new Response(JSON.stringify({ success: true, message: 'Action executed' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    console.error('[whatsapp-uazapi] Unhandled error:', error)

    const status = error.status || 500
    const code =
      error.message === 'UNAUTHORIZED'
        ? 'UNAUTHORIZED'
        : error.message === 'RATE_LIMIT_REACHED'
          ? 'RATE_LIMIT_REACHED'
          : 'INTERNAL_ERROR'

    return new Response(
      JSON.stringify({
        error: error.message,
        code,
        details: error.body,
      }),
      {
        status,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
      },
    )
  }
})
