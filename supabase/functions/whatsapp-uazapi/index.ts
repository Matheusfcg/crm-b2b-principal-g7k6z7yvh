import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const sharedCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, instance, instance_id, accept',
}

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = [
    'https://crm-b2b-principal-462cb--preview.goskip.app',
    'https://crm-vexa.goskip.app',
    'http://localhost:5173',
  ]
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : '*'
  return {
    ...sharedCorsHeaders,
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      sharedCorsHeaders['Access-Control-Allow-Headers'] + ', instance, instance_id, accept',
  }
}

const sanitizeInstanceName = (name: string) => {
  if (!name) return name
  return name.split('?')[0].split('&')[0].trim()
}

Deno.serve(async (req: Request) => {
  const adminTokenCheck = Deno.env.get('UAZAPI_ADMIN_TOKEN')
  console.log(adminTokenCheck ? 'Token carregado: Sim' : 'Token carregado: Não')

  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const bodyText = await req.text()
    let body: any = {}
    try {
      body = bodyText ? JSON.parse(bodyText) : {}
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (
      !body.action &&
      (body.event ||
        body.event_type ||
        body.message ||
        body.data ||
        (body.instance && typeof body.instance === 'string'))
    ) {
      const webhookSecret = Deno.env.get('UAZAPI_WEBHOOK_SECRET')
      if (webhookSecret) {
        const url = new URL(req.url)
        const queryToken = url.searchParams.get('token')
        const authHeaderWebhook =
          req.headers.get('authorization') ||
          req.headers.get('x-webhook-secret') ||
          req.headers.get('apikey') ||
          ''
        const providedSecret = queryToken || authHeaderWebhook.replace(/^Bearer\s+/i, '').trim()
        if (!providedSecret || providedSecret !== webhookSecret) {
          console.error('[WEBHOOK] Unauthorized request')
          return new Response(JSON.stringify({ error: 'Unauthorized webhook' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          })
        }
      }

      const eventName = body.event || body.event_type || 'unknown_event'
      console.log('[WEBHOOK] Received from Uazapi:', eventName)

      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseAdmin = createClient(
        supabaseUrl,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      )

      const instanceNameReceived = body.instance || body.instanceName || body.data?.instance

      let userId = null
      let instanceId = null

      if (instanceNameReceived) {
        const { data: inst } = await supabaseAdmin
          .from('whatsapp_instances')
          .select('id, user_id')
          .or(
            `instance_name.eq.${instanceNameReceived},instance_external_id.eq.${instanceNameReceived}`,
          )
          .maybeSingle()
        if (inst) {
          userId = inst.user_id
          instanceId = inst.id
        }
      }

      await supabaseAdmin.from('whatsapp_logs').insert({
        instance_name: instanceNameReceived || 'unknown',
        endpoint: 'webhook',
        payload: body,
        response: { event: eventName },
        user_id: userId,
      })

      if (instanceId) {
        if (
          eventName === 'CONNECTION_UPDATE' ||
          eventName === 'connection.update' ||
          eventName === 'status' ||
          eventName === 'state'
        ) {
          const state = body.data?.state || body.state || body.status
          if (state) {
            const updateData: any = { status: state, updated_at: new Date().toISOString() }
            if (state === 'open' || state === 'connected') {
              updateData.last_connection = new Date().toISOString()
              updateData.qrcode = null
            } else if (state === 'close' || state === 'disconnected') {
              updateData.qrcode = null
            }
            await supabaseAdmin.from('whatsapp_instances').update(updateData).eq('id', instanceId)
          }
        } else if (eventName === 'QRCODE_UPDATED') {
          const qr =
            body.data?.qrcode?.base64 || body.qrcode?.base64 || body.qrcode || body.data?.qrcode
          if (qr) {
            await supabaseAdmin
              .from('whatsapp_instances')
              .update({
                qrcode: qr,
                status: 'qrcode',
                updated_at: new Date().toISOString(),
              })
              .eq('id', instanceId)
          }
        }

        if (
          eventName === 'MESSAGES_UPSERT' ||
          eventName === 'messages.upsert' ||
          eventName === 'message' ||
          eventName === 'messages'
        ) {
          console.log(`[WEBHOOK] Processing messages event for instance ${instanceId}`)
          let messages = []
          if (Array.isArray(body.data?.messages)) messages = body.data.messages
          else if (Array.isArray(body.data)) messages = body.data
          else if (body.message) messages = [body]
          else if (body.data) messages = [body.data]

          for (const msg of messages) {
            const remoteJid = msg.key?.remoteJid || msg.remoteJid
            if (!remoteJid || remoteJid === 'status@broadcast') continue

            const fromMe = msg.key?.fromMe ?? msg.fromMe ?? false
            const pushName = msg.pushName || null
            const messageId = msg.key?.id || msg.id

            let text =
              msg.message?.conversation ||
              msg.message?.extendedTextMessage?.text ||
              msg.text ||
              msg.content ||
              ''

            if (!text && msg.message?.imageMessage) text = '📷 Imagem'
            if (!text && msg.message?.videoMessage) text = '🎥 Vídeo'
            if (!text && msg.message?.audioMessage) text = '🎵 Áudio'
            if (!text && msg.message?.documentMessage) text = '📄 Documento'

            const { data: contact } = await supabaseAdmin
              .from('contacts')
              .upsert(
                {
                  instance_id: instanceId,
                  remote_jid: remoteJid,
                  push_name: pushName || undefined,
                },
                { onConflict: 'instance_id, remote_jid' },
              )
              .select()
              .single()

            if (contact) {
              const { data: existingConv } = await supabaseAdmin
                .from('conversations')
                .select('id, unread_count')
                .eq('instance_id', instanceId)
                .eq('contact_id', contact.id)
                .maybeSingle()

              let unreadCount = existingConv?.unread_count || 0
              if (!fromMe) {
                unreadCount += 1
              }

              const { data: conv } = await supabaseAdmin
                .from('conversations')
                .upsert(
                  {
                    instance_id: instanceId,
                    contact_id: contact.id,
                    last_message: text,
                    updated_at: new Date().toISOString(),
                    unread_count: unreadCount,
                  },
                  { onConflict: 'instance_id, contact_id' },
                )
                .select()
                .single()

              if (conv) {
                await supabaseAdmin.from('messages').upsert(
                  {
                    conversation_id: conv.id,
                    message_id: messageId,
                    content: text,
                    from_me: fromMe,
                    type: msg.messageType || 'text',
                    timestamp: new Date(
                      msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now(),
                    ).toISOString(),
                    status: 'sent',
                  },
                  { onConflict: 'message_id' },
                )
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true, received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabaseAuthClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseAuthClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseKey,
    )

    const action = body.action

    const targetInstanceId = body.instanceId || body.instance_id
    const targetInstanceName = body.instance_name || body.instance || body.instanceName

    if (
      !targetInstanceId &&
      !targetInstanceName &&
      action !== 'check_or_create' &&
      action !== 'create'
    ) {
      return new Response(JSON.stringify({ error: 'Missing instance id or name' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    let query = supabaseAdmin.from('whatsapp_instances').select('*').eq('user_id', user.id)

    if (targetInstanceId) {
      query = query.eq('id', targetInstanceId)
    } else {
      query = query.eq('instance_name', sanitizeInstanceName(targetInstanceName || ''))
    }

    const { data: existingInstance } = await query.maybeSingle()

    if (!existingInstance && action !== 'check_or_create' && action !== 'create') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Instance not found in database for the given ID/name',
          code: 'INSTANCE_NOT_FOUND',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        },
      )
    }

    const dbServerUrl = existingInstance?.server_url
    if (!dbServerUrl && action !== 'check_or_create' && action !== 'create') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server URL not configured in database for this instance',
          code: 'MISSING_SERVER_URL',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const rawUazapiUrl = dbServerUrl || 'https://apiwhatsvexaview.uazapi.com'
    const uazapiUrl = rawUazapiUrl.trim().replace(/\/$/, '')

    const uazapiInstanceId =
      existingInstance?.instance_external_id ||
      existingInstance?.instance_name ||
      sanitizeInstanceName(targetInstanceName || '')

    if (
      !existingInstance?.instance_external_id &&
      action !== 'check_or_create' &&
      action !== 'create' &&
      action !== 'delete'
    ) {
      console.error(`[ERROR] Missing instance_external_id for instance ${internalInstanceName}`)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Instance External ID not configured in database for this instance',
          code: 'MISSING_EXTERNAL_ID',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    const internalInstanceName =
      existingInstance?.instance_name || sanitizeInstanceName(targetInstanceName || '')

    const fetchUazapi = async (path: string, options: RequestInit = {}, baseUrl: string) => {
      const url = `${baseUrl}${path}`
      let payload = null
      if (options.body && typeof options.body === 'string') {
        try {
          payload = JSON.parse(options.body)
        } catch (e) {
          payload = options.body
        }
      }

      if (payload && typeof payload === 'object') {
        delete payload.instanceId
        delete payload.instanceName
        delete payload.instance_name
        delete payload.instance_id
        delete payload.instance
        options.body = JSON.stringify(payload)
      }

      const fetchOptions = { ...options }

      if (options.method === 'GET') {
        delete fetchOptions.body
      }

      const headersObj = (fetchOptions.headers as any) || {}

      // Debug Logging: The edge function must include a console.log statement that prints the full target URL and the headers object sent to Uazapi.
      console.log(`[DEBUG] Target URL: ${url}`)
      console.log('DEBUG_URL_FINAL:', url)
      console.log(
        `[DEBUG] Headers:`,
        JSON.stringify(
          {
            ...headersObj,
            apikey: headersObj['apikey'] ? `***${headersObj['apikey'].slice(-4)}` : undefined,
            Authorization: headersObj['Authorization']
              ? `Bearer ***${headersObj['Authorization'].slice(-4)}`
              : undefined,
          },
          null,
          2,
        ),
      )

      const tokenUsed = headersObj['apikey'] || headersObj['adminToken'] || 'none'
      const instanceNameSent = headersObj['instance'] || 'none'
      const maskedToken =
        tokenUsed.length > 8
          ? `${tokenUsed.substring(0, 4)}...${tokenUsed.substring(tokenUsed.length - 4)}`
          : '***'

      const logObject: any = {
        level: 'info',
        message: 'Uazapi API Request',
        endpoint: url,
        instance_name_sent: instanceNameSent,
        token_used: maskedToken,
      }

      if (payload && Object.keys(payload).length > 0 && fetchOptions.method !== 'GET') {
        logObject.payload = payload
      }

      console.log(JSON.stringify(logObject))

      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(new Error('Uazapi Request Timeout')),
        45000,
      )

      if (fetchOptions.method === 'GET' || !fetchOptions.body || fetchOptions.body === '{}') {
        console.log(`Enviando para: [${url}]`)
      } else {
        console.log(`Enviando para: [${url}] Body: [${fetchOptions.body}]`)
      }

      fetchOptions.signal = controller.signal

      try {
        const res = await fetch(url, fetchOptions)
        clearTimeout(timeoutId)
        const status = res.status
        const text = await res.text()

        let parsedBody: any = text
        try {
          if (text) parsedBody = JSON.parse(text)
        } catch (e) {}

        await supabaseAdmin.from('whatsapp_logs').insert({
          instance_name: internalInstanceName,
          endpoint: url,
          payload: payload,
          response: { status, body: parsedBody },
          user_id: user.id,
        })

        if (!res.ok) {
          console.error(
            `[ERROR] action: uazapi_fetch, instance: ${uazapiInstanceId}, internal_name: ${internalInstanceName}, status: ${status}, path: ${path}, details: ${text}`,
          )
          if (status === 404 || status === 405 || text.toLowerCase().includes('not found')) {
            console.log(`[DEBUG ${status}] Full response body: ${text}`)
          }
        }

        return { ok: res.ok, status, text, parsedBody }
      } catch (err: any) {
        clearTimeout(timeoutId)
        console.error(`[ERROR] Uazapi fetch failed:`, err)

        const isTimeout = err.name === 'AbortError' || err.message === 'Uazapi Request Timeout'

        await supabaseAdmin.from('whatsapp_logs').insert({
          instance_name: internalInstanceName,
          endpoint: url,
          payload: payload,
          response: { status: 0, error: err.message, timeout: isTimeout },
          user_id: user.id,
        })

        if (existingInstance && existingInstance.id) {
          await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              last_error: isTimeout
                ? 'Tempo limite de conexão (Timeout) com o servidor da Uazapi.'
                : err.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingInstance.id)
        }

        if (isTimeout) {
          return {
            ok: false,
            status: 408,
            text: '',
            parsedBody: {
              error: 'Ocorreu um tempo limite na conexão. A API da Uazapi não respondeu a tempo.',
            },
            isNetworkError: true,
            isTimeout: true,
          }
        }

        return {
          ok: false,
          status: 0,
          text: '',
          parsedBody: { error: 'Server Unreachable' },
          isNetworkError: true,
        }
      }
    }

    const extractQrCode = (parsedBody: any) => {
      let rawQrcode =
        parsedBody?.base64 ||
        parsedBody?.qrcode?.base64 ||
        parsedBody?.qrcode ||
        parsedBody?.qr ||
        parsedBody?.code ||
        parsedBody?.instance?.qrcode ||
        parsedBody?.instance?.qr ||
        parsedBody?.data?.qrcode ||
        parsedBody?.data?.qr ||
        null
      let qrcode = rawQrcode
      if (qrcode === 404 || qrcode === 405 || qrcode === '404' || qrcode === '405') {
        return null
      }
      if (qrcode && typeof qrcode === 'string') {
        if (qrcode.length <= 3) {
          return null
        }
        if (!qrcode.startsWith('data:image') && !qrcode.startsWith('http')) {
          qrcode = `data:image/png;base64,${qrcode}`
        }
      }
      return qrcode
    }

    const getApiHeaders = (token: string) => {
      const apiKey = token

      const headers: any = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }

      if (apiKey) {
        headers['apikey'] = apiKey
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      return headers
    }

    const setWebhook = async (externalId: string, token: string) => {
      let webhookUrl = 'https://gmnaadyvmhzqahdtzbun.supabase.co/functions/v1/whatsapp-uazapi'
      const webhookSecret = Deno.env.get('UAZAPI_WEBHOOK_SECRET')
      if (webhookSecret) {
        webhookUrl += `?token=${webhookSecret}`
      }
      const cleanExternalId = sanitizeInstanceName(externalId)

      const payload = {
        url: webhookUrl,
        webhookUrl: webhookUrl,
        webhook: webhookUrl,
        webhookByEvents: false,
        events: [
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE',
          'QRCODE_UPDATED',
          'SEND_MESSAGE',
          'messages',
          'messages.upsert',
          'messages.update',
          'connection.update',
        ],
      }

      let res = await fetchUazapi(
        `/webhook/set/${cleanExternalId}`,
        {
          method: 'POST',
          headers: getApiHeaders(token),
          body: JSON.stringify(payload),
        },
        uazapiUrl,
      )

      if (!res.ok || res.status === 404 || res.status === 405) {
        console.log(`[WEBHOOK] Falling back to alternative webhook endpoint for ${cleanExternalId}`)
        res = await fetchUazapi(
          `/webhook/set`,
          {
            method: 'POST',
            headers: getApiHeaders(token),
            body: JSON.stringify(payload),
          },
          uazapiUrl,
        )
      }
      return res
    }

    if (action === 'check_or_create') {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Criação ou inicialização de novas instâncias foi desabilitada. Use o modo de status.',
          code: 'CREATION_DISABLED',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else if (action === 'get_status' || action === 'connect' || action === 'force_sync') {
      if (
        action === 'get_status' &&
        existingInstance?.status === 'open' &&
        existingInstance?.updated_at
      ) {
        const lastUpdate = new Date(existingInstance.updated_at).getTime()
        if (Date.now() - lastUpdate < 30000) {
          console.log(
            `[ROUTING] Bypassing Uazapi status check, returning recent DB state for ${internalInstanceName}`,
          )
          return new Response(
            JSON.stringify({
              success: true,
              instance: existingInstance,
              phone: existingInstance.phone,
              uazapiUrl,
              is_connecting: false,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }

      const returnedToken = existingInstance?.instance_token

      if (!returnedToken) {
        return new Response(
          JSON.stringify({
            error: 'Token de autenticação não configurado no banco de dados para esta instância.',
            code: 'TOKEN_MISSING',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }

      const externalIdStr = uazapiInstanceId as string

      if (action === 'force_sync') {
        try {
          await fetchUazapi(
            `/instance/logout/${sanitizeInstanceName(externalIdStr)}`,
            {
              method: 'DELETE',
              headers: getApiHeaders(returnedToken || ''),
            },
            uazapiUrl,
          )
        } catch (e) {}
      }

      await setWebhook(externalIdStr, returnedToken || '')

      let stateRes

      const cleanExternalId = sanitizeInstanceName(externalIdStr)

      if (action === 'connect') {
        stateRes = await fetchUazapi(
          `/instance/connect/${cleanExternalId}`,
          {
            method: 'POST',
            headers: getApiHeaders(returnedToken || ''),
          },
          uazapiUrl,
        )
      } else {
        stateRes = await fetchUazapi(
          `/instance/status/${cleanExternalId}`,
          {
            method: 'GET',
            headers: getApiHeaders(returnedToken || ''),
          },
          uazapiUrl,
        )

        if (stateRes.status === 404 || stateRes.status === 405) {
          stateRes = await fetchUazapi(
            `/instance/connectionState/${cleanExternalId}`,
            {
              method: 'GET',
              headers: getApiHeaders(returnedToken || ''),
            },
            uazapiUrl,
          )
        }

        if (stateRes.status === 404 || stateRes.status === 405) {
          stateRes = await fetchUazapi(
            `/instance/connectionStatus/${cleanExternalId}`,
            {
              method: 'GET',
              headers: getApiHeaders(returnedToken || ''),
            },
            uazapiUrl,
          )
        }
      }

      if ((stateRes as any).isNetworkError) {
        const errorMsg = (stateRes as any).isTimeout
          ? 'Ocorreu um tempo limite na conexão. A API da Uazapi não respondeu a tempo.'
          : 'Erro de Conexão: Não foi possível alcançar o servidor da Uazapi.'
        return new Response(
          JSON.stringify({
            error: errorMsg,
            code: (stateRes as any).isTimeout ? 'TIMEOUT' : 'SERVER_UNREACHABLE',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 503,
          },
        )
      }

      if (stateRes.ok && !stateRes.parsedBody?.error) {
        const stateData = stateRes.parsedBody
        const state =
          stateData?.instance?.state ||
          stateData?.state ||
          stateData?.stateConnection ||
          stateData?.status ||
          'connecting'
        const phone =
          stateData?.instance?.owner || stateData?.owner || stateData?.number || stateData?.phone

        const updateData: any = {
          status: state,
          last_error: null,
          updated_at: new Date().toISOString(),
        }
        if (phone) updateData.phone = phone
        if (state === 'open' || state === 'connected') {
          updateData.qrcode = null
          updateData.last_connection = new Date().toISOString()
        } else if (state === 'connecting' || state === 'qrcode' || state === 'disconnected') {
          let statusQr =
            extractQrCode({ base64: stateData?.instance?.qrcode }) || extractQrCode(stateData)

          if (statusQr) {
            updateData.qrcode = statusQr
          }
        }

        let finalInstance = existingInstance

        if (existingInstance) {
          const { data } = await supabaseAdmin
            .from('whatsapp_instances')
            .update(updateData)
            .eq('id', existingInstance.id)
            .select()
            .single()
          finalInstance = data
        }

        const safeInstance = finalInstance
          ? {
              id: finalInstance.id,
              user_id: finalInstance.user_id,
              status: finalInstance.status,
              qrcode: finalInstance.qrcode,
              last_connection: finalInstance.last_connection,
              phone: finalInstance.phone,
              instance_name: finalInstance.instance_name,
              instance_token: finalInstance.instance_token,
              server_url: finalInstance.server_url,
            }
          : null

        return new Response(
          JSON.stringify({
            success: true,
            instance: safeInstance,
            phone: phone,
            uazapiUrl,
            is_connecting: finalInstance?.status === 'connecting',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      } else if (
        stateRes.status === 401 ||
        stateRes.status === 403 ||
        stateRes.parsedBody?.message === 'Unauthorized' ||
        stateRes.parsedBody?.error === 'Unauthorized'
      ) {
        if (existingInstance) {
          const { data } = await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              status: 'unauthorized',
              qrcode: null,
              last_error: 'Erro de Autenticação (401)',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingInstance.id)
            .select()
            .single()

          const safeInstance = { ...data }
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Erro de Autenticação: Verifique seu Token e Instance ID nas configurações.',
              instance: safeInstance,
              code: 'UNAUTHORIZED',
              details: stateRes.parsedBody,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 401,
            },
          )
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Erro de Autenticação: Verifique seu Token e Instance ID nas configurações.',
            code: 'UNAUTHORIZED',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          },
        )
      } else if (
        stateRes.status === 404 ||
        stateRes.parsedBody?.error ||
        stateRes.parsedBody?.message === 'Instance not found'
      ) {
        if (existingInstance) {
          const { data } = await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              status: 'not_found',
              qrcode: null,
              last_error:
                stateRes.parsedBody?.error || stateRes.parsedBody?.message || 'Instance not found',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingInstance.id)
            .select()
            .single()

          const safeInstance = { ...data }
          return new Response(
            JSON.stringify({
              success: false,
              error:
                stateRes.parsedBody?.error || stateRes.parsedBody?.message || 'Instance not found',
              instance: safeInstance,
              code: 'INSTANCE_NOT_FOUND',
              details: stateRes.parsedBody,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Instance not found',
            code: 'INSTANCE_NOT_FOUND',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to get state', details: stateRes.parsedBody }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: stateRes.status === 401 ? 401 : 400,
          },
        )
      }
    } else if (action === 'send_message') {
      const returnedToken = existingInstance?.instance_token
      if (!returnedToken) {
        return new Response(
          JSON.stringify({
            error: 'Instance token not configured in database',
            code: 'TOKEN_MISSING',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }

      const remoteJid = body.remoteJid
      const text = body.text

      if (!remoteJid || !text) {
        return new Response(JSON.stringify({ error: 'Missing remoteJid or text' }), {
          status: 400,
          headers: corsHeaders,
        })
      }

      const cleanExternalId = sanitizeInstanceName(uazapiInstanceId!)
      const sendRes = await fetchUazapi(
        '/message/sendText',
        {
          method: 'POST',
          headers: {
            ...getApiHeaders(returnedToken || ''),
            instance: cleanExternalId,
          },
          body: JSON.stringify({
            number: remoteJid,
            options: {
              delay: 1200,
              presence: 'composing',
              linkPreview: false,
            },
            textMessage: {
              text: text,
            },
          }),
        },
        uazapiUrl,
      )

      if (!sendRes.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to send message', details: sendRes.parsedBody }),
          { status: sendRes.status, headers: corsHeaders },
        )
      }

      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('instance_id', existingInstance.id)
        .eq('remote_jid', remoteJid)
        .maybeSingle()

      if (contact) {
        const { data: conv } = await supabaseAdmin
          .from('conversations')
          .update({
            last_message: text,
            updated_at: new Date().toISOString(),
          })
          .eq('instance_id', existingInstance.id)
          .eq('contact_id', contact.id)
          .select()
          .single()

        if (conv) {
          await supabaseAdmin.from('messages').insert({
            conversation_id: conv.id,
            message_id:
              sendRes.parsedBody?.key?.id ||
              sendRes.parsedBody?.message?.key?.id ||
              `msg_${Date.now()}`,
            content: text,
            from_me: true,
            type: 'text',
            timestamp: new Date().toISOString(),
            status: 'sent',
          })
        }
      }

      return new Response(JSON.stringify({ success: true, data: sendRes.parsedBody }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else if (action === 'get_conversations') {
      const returnedToken = existingInstance?.instance_token
      if (!returnedToken) {
        return new Response(
          JSON.stringify({
            error: 'Instance token not configured in database',
            code: 'TOKEN_MISSING',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }

      const cleanExternalId = sanitizeInstanceName(uazapiInstanceId!)
      const chatsRes = await fetchUazapi(
        '/chat/fetchChats',
        {
          method: 'GET',
          headers: {
            ...getApiHeaders(returnedToken || ''),
            instance: cleanExternalId,
          },
        },
        uazapiUrl,
      )

      if (!chatsRes.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch chats', details: chatsRes.parsedBody }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: chatsRes.status,
          },
        )
      }

      const chats = chatsRes.parsedBody
      if (Array.isArray(chats)) {
        for (const chat of chats) {
          const remoteJid = chat.id || chat.remoteJid
          if (!remoteJid || remoteJid === 'status@broadcast') continue

          const pushName = chat.name || chat.pushName || null
          const profilePicUrl = chat.profilePictureUrl || chat.profilePicUrl || null
          const unreadCount = chat.unreadCount || 0

          let lastMessage = ''
          if (chat.lastMessage?.message?.conversation) {
            lastMessage = chat.lastMessage.message.conversation
          } else if (chat.lastMessage?.message?.extendedTextMessage?.text) {
            lastMessage = chat.lastMessage.message.extendedTextMessage.text
          } else if (chat.lastMessage?.text) {
            lastMessage = chat.lastMessage.text
          }

          const timestamp =
            chat.timestamp || chat.conversationTimestamp
              ? new Date((chat.timestamp || chat.conversationTimestamp) * 1000).toISOString()
              : new Date().toISOString()

          const { data: contact } = await supabaseAdmin
            .from('contacts')
            .upsert(
              {
                instance_id: existingInstance.id,
                remote_jid: remoteJid,
                push_name: pushName,
                profile_picture: profilePicUrl,
              },
              { onConflict: 'instance_id, remote_jid' },
            )
            .select()
            .single()

          if (contact) {
            const { data: conv } = await supabaseAdmin
              .from('conversations')
              .upsert(
                {
                  instance_id: existingInstance.id,
                  contact_id: contact.id,
                  last_message: lastMessage || 'Mídia/Outro',
                  unread_count: unreadCount,
                  updated_at: timestamp,
                },
                { onConflict: 'instance_id, contact_id' },
              )
              .select()
              .single()

            if (conv && chat.lastMessage) {
              const msgId = chat.lastMessage.key?.id || chat.lastMessage.id || `msg_${Date.now()}`
              if (msgId) {
                await supabaseAdmin.from('messages').upsert(
                  {
                    conversation_id: conv.id,
                    message_id: msgId,
                    content: lastMessage,
                    from_me: chat.lastMessage.key?.fromMe || false,
                    type: chat.lastMessage.messageType || 'text',
                    timestamp: timestamp,
                    status: 'sent',
                  },
                  { onConflict: 'message_id' },
                )
              }
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true, count: Array.isArray(chats) ? chats.length : 0 }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    } else if (action === 'delete') {
      try {
        const returnedToken = existingInstance?.instance_token
        if (returnedToken && existingInstance?.instance_external_id) {
          const cleanExternalId = sanitizeInstanceName(existingInstance.instance_external_id)
          await fetchUazapi(
            '/instance/delete/' + cleanExternalId,
            {
              method: 'DELETE',
              headers: getApiHeaders(returnedToken || ''),
            },
            uazapiUrl,
          )
        }
      } catch (err: any) {
        console.error('Logout error:', err)
      }

      if (existingInstance) {
        const { error } = await supabaseAdmin
          .from('whatsapp_instances')
          .delete()
          .eq('id', existingInstance.id)
        if (error) throw error
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  } catch (err: any) {
    console.error('Internal Function Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Ocorreu um erro interno' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
