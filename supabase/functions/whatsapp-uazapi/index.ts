import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin') || 'unknown'
  console.log(`[DEBUG] Incoming request from Origin: ${origin}`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let reqBody: any = {}
    try {
      const text = await req.text()
      if (text) {
        reqBody = JSON.parse(text)
      }
    } catch (e) {
      console.error('[DEBUG] Erro ao parsear JSON do body:', e)
      return new Response(JSON.stringify({ error: 'Payload inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (reqBody?.event) {
      const event = reqBody.event
      const instanceNameWebhook = reqBody.instance || reqBody.instanceName
      console.log(`[DEBUG] Webhook received: ${event} for instance: ${instanceNameWebhook}`)

      if (event === 'connection.update') {
        const state = reqBody.data?.state || reqBody.data?.status
        console.log(`[DEBUG] Webhook connection state: ${state}`)
        if (['open', 'connected', 'loggedIn'].includes(state)) {
          await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              status: 'connected',
              qrcode: null,
              updated_at: new Date().toISOString(),
            })
            .eq('instance_name', instanceNameWebhook)
        } else if (state === 'connecting' || reqBody.data?.qrcode) {
          await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              status: 'connecting',
              qrcode: reqBody.data?.qrcode || null,
              updated_at: new Date().toISOString(),
            })
            .eq('instance_name', instanceNameWebhook)
        } else if (state === 'close') {
          await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              status: 'disconnected',
              updated_at: new Date().toISOString(),
            })
            .eq('instance_name', instanceNameWebhook)
        }
      }

      if (event === 'messages.upsert') {
        console.log(`[DEBUG] Received message from webhook for ${instanceNameWebhook}`)
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const action = reqBody?.action
    const instanceId = reqBody?.instanceId
    const instanceName = reqBody?.instanceName || reqBody?.instance_name

    if (action === 'get_conversations') {
      console.log(
        `[DEBUG_WHATSAPP] Action get_conversations called for instanceId: ${instanceId}, instanceName: ${instanceName}`,
      )
    }

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action não reconhecida. Verifique o payload.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (!instanceId && !instanceName) {
      return new Response(JSON.stringify({ error: 'Instance ID ou Name não fornecido.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let query = supabaseAdmin.from('whatsapp_instances').select('*')
    if (instanceId) {
      query = query.eq('id', instanceId)
    } else {
      query = query.eq('instance_name', instanceName)
    }
    const { data: instanceData, error: instanceError } = await query.maybeSingle()

    if (instanceError || !instanceData) {
      return new Response(
        JSON.stringify({
          code: 'INSTANCE_CONFIG_NOT_FOUND',
          error: 'Configuração da instância não encontrada',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const serverUrl = instanceData.server_url
    const token = instanceData.instance_token

    if (!token || !serverUrl) {
      return new Response(
        JSON.stringify({
          code: 'INSTANCE_CONFIG_NOT_FOUND',
          error: 'Configuração da instância não encontrada',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const fetchUazapi = async (path: string, options: RequestInit = {}, timeoutMs = 25000) => {
      const url = `${serverUrl.replace(/\/$/, '')}${path}`
      const headers: Record<string, string> = {
        token: token,
        ...((options.headers as Record<string, string>) || {}),
      }

      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const fetchOptions: RequestInit = { ...options, headers, signal: controller.signal }

      if (fetchOptions.method === 'GET' || fetchOptions.method === 'HEAD') {
        delete fetchOptions.body
      }

      console.log(`[DEBUG] Request: ${fetchOptions.method || 'GET'} ${url}`)

      try {
        const res = await fetch(url, fetchOptions)
        clearTimeout(timeoutId)
        const text = await res.text()
        let parsedBody: any = {}

        if (text && text.trim() !== '') {
          try {
            parsedBody = JSON.parse(text)
          } catch (e) {
            parsedBody = { data: text }
          }
        }

        if (res.ok) {
          if (path.includes('/instance/status') || path.includes('/instance/connect')) {
            console.log(`[DEBUG] 200 OK received from Uazapi after ${path} event`)
          }
        } else {
          console.error(`[DEBUG] Uazapi request failed with status ${res.status}. Body: ${text}`)
        }

        return { ok: res.ok, status: res.status, parsedBody }
      } catch (err: any) {
        clearTimeout(timeoutId)
        if (err.name === 'AbortError') {
          console.error(`[DEBUG] Timeout na requisição para ${url}`)
          return {
            ok: false,
            status: 504,
            parsedBody: { error: 'Tempo limite de conexão excedido com a Uazapi' },
          }
        }
        console.error(`[DEBUG] Erro na requisição para ${url}:`, err)
        return {
          ok: false,
          status: 500,
          parsedBody: { error: err.message || 'Erro de comunicação com o provedor' },
        }
      }
    }

    const handleUazapiErrors = async (res: any) => {
      if (!res.ok) {
        console.error(`[DEBUG] API Error captured. Status: ${res.status}. Body:`, res.parsedBody)
      }

      if (res.status === 401 || res.status === 403) {
        const errorMsg =
          res.status === 401 ? 'Token inválido ou expirado (401)' : 'Acesso negado (403)'
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({ status: 'unauthorized', last_error: errorMsg })
          .eq('id', instanceData.id)
        return new Response(JSON.stringify({ code: 'UNAUTHORIZED', error: errorMsg }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (res.status === 504 || res.status >= 500) {
        return new Response(
          JSON.stringify({
            code: 'SERVER_ERROR',
            error: `Erro no servidor da API (${res.status})`,
          }),
          { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (res.status === 404) {
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({ status: 'not_found', last_error: 'Instância não encontrada na Uazapi (404)' })
          .eq('id', instanceData.id)
        return new Response(
          JSON.stringify({
            code: 'INSTANCE_NOT_FOUND',
            error: 'Instância não encontrada na Uazapi (404)',
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      if (res.status === 429) {
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({
            status: 'rate_limited',
            last_error:
              'Limite de requisições ou instâncias atingido (429). Por favor, verifique seu plano na Uazapi.',
          })
          .eq('id', instanceData.id)
        return new Response(
          JSON.stringify({
            code: 'RATE_LIMIT_REACHED',
            error:
              'Limite de requisições ou instâncias atingido (429). Por favor, verifique seu plano na Uazapi.',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      return null
    }

    switch (action) {
      case 'get_conversations': {
        const startTime = Date.now()
        console.log(`[DEBUG_WHATSAPP] Starting get_conversations for instance ${instanceData.id}`)

        const res = await fetchUazapi(`/chat/find`, {
          method: 'POST',
          body: JSON.stringify({
            sort: '-wa_lastMsgTimestamp',
            limit: 100,
            offset: 0,
          }),
        })

        const errResp = await handleUazapiErrors(res)
        if (errResp) {
          console.error(
            `[DEBUG] get_conversations Uazapi error: Status ${res.status}, Body:`,
            res.parsedBody,
          )
          await supabaseAdmin.from('whatsapp_logs').insert({
            instance_name: instanceData.instance_name,
            endpoint: '/chat/find',
            payload: { action: 'get_conversations' },
            response: res.parsedBody || { error: `HTTP ${res.status}` },
          })
          return errResp
        }

        const chats = Array.isArray(res.parsedBody)
          ? res.parsedBody
          : res.parsedBody?.data && Array.isArray(res.parsedBody.data)
            ? res.parsedBody.data
            : []

        if (!Array.isArray(chats)) {
          console.error(`[DEBUG] Invalid payload format received from Uazapi:`, res.parsedBody)
          await supabaseAdmin.from('whatsapp_logs').insert({
            instance_name: instanceData.instance_name,
            endpoint: '/chat/find',
            payload: { action: 'get_conversations' },
            response: res.parsedBody || { error: 'Invalid format' },
          })
          return new Response(
            JSON.stringify({ error: 'Formato de resposta inválido da Uazapi.' }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }

        console.log(`[DEBUG_WHATSAPP] Received ${chats.length} chats from Uazapi`)

        if (chats.length > 0) {
          const contactsData: any[] = []
          const uniqueJids = new Set<string>()

          for (const chat of chats) {
            const remoteJid = chat.id || chat.remoteJid
            if (!remoteJid) continue
            if (uniqueJids.has(remoteJid)) continue
            uniqueJids.add(remoteJid)

            const pushName = chat.name || chat.pushName || remoteJid.split('@')[0]

            let profilePic = chat.profilePicUrl || chat.profilePicture || null
            if (profilePic && typeof profilePic === 'string' && !profilePic.startsWith('http')) {
              profilePic = null
            }

            contactsData.push({
              instance_id: instanceData.id,
              remote_jid: remoteJid,
              push_name: pushName,
              profile_picture: profilePic,
            })
          }

          if (contactsData.length > 0) {
            const CHUNK_SIZE = 50
            for (let i = 0; i < contactsData.length; i += CHUNK_SIZE) {
              const chunk = contactsData.slice(i, i + CHUNK_SIZE)
              const { error: contactsError } = await supabaseAdmin
                .from('contacts')
                .upsert(chunk, { onConflict: 'instance_id,remote_jid' })
              if (contactsError) {
                console.error('[DEBUG] Error upserting contacts chunk:', contactsError)
              }
            }

            const jids = Array.from(uniqueJids)
            const upsertedContacts: any[] = []

            for (let i = 0; i < jids.length; i += CHUNK_SIZE) {
              const chunkJids = jids.slice(i, i + CHUNK_SIZE)
              const { data: fetchedContacts, error: fetchContactsError } = await supabaseAdmin
                .from('contacts')
                .select('id, remote_jid')
                .eq('instance_id', instanceData.id)
                .in('remote_jid', chunkJids)

              if (fetchContactsError) {
                console.error('[DEBUG] Error fetching contacts:', fetchContactsError)
              } else if (fetchedContacts) {
                upsertedContacts.push(...fetchedContacts)
              }
            }

            if (upsertedContacts.length > 0) {
              const conversationsData: any[] = []
              for (const chat of chats) {
                const remoteJid = chat.id || chat.remoteJid
                if (!remoteJid) continue

                const contact = upsertedContacts.find((c: any) => c.remote_jid === remoteJid)
                if (!contact) continue

                let lastMessageText = ''
                if (chat.lastMessage) {
                  const msg = chat.lastMessage.message || chat.lastMessage
                  lastMessageText =
                    msg?.conversation ||
                    msg?.extendedTextMessage?.text ||
                    msg?.text ||
                    msg?.imageMessage?.caption ||
                    msg?.videoMessage?.caption ||
                    msg?.documentMessage?.caption ||
                    ''

                  if (!lastMessageText) {
                    if (msg?.imageMessage) lastMessageText = '📷 Imagem'
                    else if (msg?.videoMessage) lastMessageText = '🎥 Vídeo'
                    else if (msg?.audioMessage) lastMessageText = '🎵 Áudio'
                    else if (msg?.documentMessage) lastMessageText = '📄 Documento'
                    else if (msg?.stickerMessage) lastMessageText = '🌟 Sticker'
                  }
                }

                const timestamp = chat.conversationTimestamp || chat.timestamp
                const updatedAt = timestamp
                  ? new Date(timestamp * 1000).toISOString()
                  : new Date().toISOString()

                conversationsData.push({
                  instance_id: instanceData.id,
                  contact_id: contact.id,
                  last_message: lastMessageText,
                  unread_count: chat.unreadCount || 0,
                  updated_at: updatedAt,
                })
              }

              const uniqueConvs = Array.from(
                new Map(
                  conversationsData.map((c) => [`${c.instance_id}_${c.contact_id}`, c]),
                ).values(),
              )

              if (uniqueConvs.length > 0) {
                const CHUNK_SIZE = 50
                for (let i = 0; i < uniqueConvs.length; i += CHUNK_SIZE) {
                  const chunk = uniqueConvs.slice(i, i + CHUNK_SIZE)
                  const { error: convError } = await supabaseAdmin
                    .from('conversations')
                    .upsert(chunk, { onConflict: 'instance_id,contact_id' })

                  if (convError) {
                    console.error('[DEBUG] Error upserting conversations chunk:', convError)
                  }
                }
              }
            }
          }
        }

        const endTime = Date.now()
        console.log(
          `[DEBUG_WHATSAPP] Processed ${chats.length} conversations in ${endTime - startTime}ms`,
        )

        return new Response(
          JSON.stringify({ success: true, count: chats.length, payload: chats.slice(0, 10) }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      case 'connect':
      case 'get_qr': {
        const res = await fetchUazapi(`/instance/connect`, {
          method: 'POST',
          body: JSON.stringify({
            browser: 'auto',
            timeout: 180000,
            keepAlive: true,
          }),
        })

        const errResp = await handleUazapiErrors(res)
        if (errResp) return errResp

        if (res.ok) {
          await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              status: 'connecting',
              qrcode: res.parsedBody?.base64 || res.parsedBody?.qrcode || null,
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', instanceData.id)
        }

        return new Response(JSON.stringify(res.parsedBody || { success: true }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'force_sync':
      case 'get_status': {
        const res = await fetchUazapi(`/instance/status`, {
          method: 'GET',
        })

        const errResp = await handleUazapiErrors(res)
        if (errResp) return errResp

        if (res.ok && res.parsedBody) {
          const state =
            res.parsedBody.state || res.parsedBody.status || res.parsedBody.instance?.state
          const qrcode =
            res.parsedBody.base64 || res.parsedBody.qrcode || res.parsedBody.instance?.qrcode

          if (['connected', 'open', 'loggedIn'].includes(state)) {
            await supabaseAdmin
              .from('whatsapp_instances')
              .update({
                status: 'connected',
                qrcode: null,
                last_connection: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', instanceData.id)
          } else if (['connecting', 'qrcode'].includes(state) || qrcode) {
            const updatePayload: any = {
              status: 'connecting',
              updated_at: new Date().toISOString(),
            }
            if (qrcode && typeof qrcode === 'string' && qrcode.length > 10) {
              updatePayload.qrcode = qrcode
            }
            await supabaseAdmin
              .from('whatsapp_instances')
              .update(updatePayload)
              .eq('id', instanceData.id)
          }
        }

        return new Response(JSON.stringify(res.parsedBody || { success: true }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'send_message': {
        const number = reqBody?.number || reqBody?.remoteJid
        const text = reqBody?.text || reqBody?.message

        if (!number || !text) {
          return new Response(JSON.stringify({ error: 'Missing number or text' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const res = await fetchUazapi(`/send/text`, {
          method: 'POST',
          body: JSON.stringify({ number, text, readchat: true }),
        })

        const errResp = await handleUazapiErrors(res)
        if (errResp) return errResp

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'setup_webhook': {
        const edgeFunctionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-uazapi`
        const webhookUrl = reqBody?.url || edgeFunctionUrl

        const res = await fetchUazapi(`/webhook`, {
          method: 'POST',
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: ['messages', 'connection'],
          }),
        })

        const errResp = await handleUazapiErrors(res)
        if (errResp) return errResp

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default: {
        return new Response(
          JSON.stringify({ error: 'Action não reconhecida. Verifique o payload.' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }
    }
  } catch (err: any) {
    console.error('[DEBUG] Erro interno Edge Function:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
