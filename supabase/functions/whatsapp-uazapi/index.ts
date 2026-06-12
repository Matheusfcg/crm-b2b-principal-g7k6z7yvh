import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const getCorsHeaders = (origin: string | null) => {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, instance, accept',
  }
}

const sanitizeInstanceName = (name: string) => {
  if (!name) return name
  return name.split('?')[0].split('&')[0].trim()
}

Deno.serve(async (req: Request) => {
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
        if (eventName === 'CONNECTION_UPDATE' || eventName === 'status' || eventName === 'state') {
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

        if (eventName === 'MESSAGES_UPSERT' || eventName === 'message') {
          const messages = body.data?.messages || (body.message ? [body] : [])
          for (const msg of messages) {
            const remoteJid = msg.key?.remoteJid || msg.remoteJid
            if (!remoteJid || remoteJid === 'status@broadcast') continue

            const fromMe = msg.key?.fromMe || msg.fromMe
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

    const providedId = body.instanceId || body.instanceName || body.instance
    const isProvidedIdUuid =
      providedId &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        providedId,
      )

    let query = supabaseAdmin.from('whatsapp_instances').select('*').eq('user_id', user.id)

    if (providedId) {
      if (isProvidedIdUuid) {
        query = query.eq('id', providedId)
      } else {
        query = query.eq('instance_name', providedId)
      }
    }

    const { data: existingInstance } = await query.maybeSingle()

    const rawUazapiUrl =
      existingInstance?.server_url ||
      Deno.env.get('UAZAPI_SERVER_URL') ||
      Deno.env.get('UAZAPI_URL') ||
      Deno.env.get('UAZAPI_BASE_URL') ||
      'https://apiwhatsvexaview.uazapi.com'
    const globalAdminToken =
      Deno.env.get('UAZAPI_ADMIN_TOKEN') ||
      Deno.env.get('UAZAPI_TOKEN') ||
      Deno.env.get('UAZAPI_API_KEY') ||
      ''
    const uazapiUrl = rawUazapiUrl.trim().replace(/\/$/, '')

    let instanceName = existingInstance?.instance_name || (!isProvidedIdUuid ? providedId : null)

    if (
      instanceName &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        instanceName,
      )
    ) {
      instanceName = null
    }

    const uazapiInstanceId = existingInstance?.instance_external_id || instanceName

    if (!uazapiInstanceId && action !== 'check_or_create') {
      return new Response(
        JSON.stringify({
          success: true,
          error: 'Instance not found in database',
          code: 'INSTANCE_NOT_FOUND',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        },
      )
    }

    const fetchUazapi = async (path: string, options: RequestInit = {}) => {
      const url = `${uazapiUrl}${path}`
      const payload = options.body ? JSON.parse(options.body as string) : null

      const headersObj = (options.headers as any) || {}
      const tokenUsed = headersObj['apikey'] || headersObj['admintoken'] || 'none'
      const instanceNameSent = headersObj['instance'] || 'none'
      const maskedToken =
        tokenUsed.length > 8
          ? `${tokenUsed.substring(0, 4)}...${tokenUsed.substring(tokenUsed.length - 4)}`
          : '***'

      console.log(
        JSON.stringify({
          level: 'info',
          message: 'Uazapi API Request',
          endpoint: url,
          instance_name_sent: instanceNameSent,
          token_used: maskedToken,
          payload: payload,
        }),
      )

      const controller = new AbortController()
      const timeoutId = setTimeout(
        () => controller.abort(new Error('Uazapi Request Timeout')),
        45000,
      )

      const fetchOptions = {
        ...options,
        signal: controller.signal,
      }

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
          instance_name: uazapiInstanceId,
          endpoint: url,
          payload: payload,
          response: { status, body: parsedBody },
          user_id: user.id,
        })

        if (!res.ok) {
          console.error(
            `[ERROR] action: uazapi_fetch, instance: ${uazapiInstanceId}, status: ${status}, path: ${path}, details: ${text}`,
          )
        }

        return { ok: res.ok, status, text, parsedBody }
      } catch (err: any) {
        clearTimeout(timeoutId)
        console.error(`[ERROR] Uazapi fetch failed:`, err)

        const isTimeout = err.name === 'AbortError' || err.message === 'Uazapi Request Timeout'

        await supabaseAdmin.from('whatsapp_logs').insert({
          instance_name: uazapiInstanceId,
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

    const getApiHeaders = (token: string, instance?: string) => {
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['apikey'] = token
        headers['Authorization'] = `Bearer ${token}`
      }
      if (globalAdminToken) {
        headers['admintoken'] = globalAdminToken
      }
      if (instance) {
        headers['instance'] = instance
      }
      return headers
    }

    const setWebhook = async (instanceName: string, token: string) => {
      const webhookUrl = 'https://gmnaadyvmhzqahdtzbun.supabase.co/functions/v1/whatsapp-uazapi'
      const cleanInstanceName = sanitizeInstanceName(instanceName)

      const payload = {
        url: webhookUrl,
        webhookUrl: webhookUrl,
        webhook: webhookUrl,
        webhookByEvents: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'SEND_MESSAGE'],
      }

      let res = await fetchUazapi(`/webhook/set/${cleanInstanceName}`, {
        method: 'POST',
        headers: getApiHeaders(token, cleanInstanceName),
        body: JSON.stringify(payload),
      })

      if (!res.ok || res.status === 404) {
        res = await fetchUazapi(`/instance/webhook`, {
          method: 'POST',
          headers: getApiHeaders(token, cleanInstanceName),
          body: JSON.stringify({ instance: cleanInstanceName, url: webhookUrl, webhookUrl }),
        })
      }
      return res
    }

    const connectInstance = async (targetInstanceName: string, token: string) => {
      const cleanInstanceName = sanitizeInstanceName(targetInstanceName)
      const connectHeaders = getApiHeaders(token, cleanInstanceName)

      let attempt = 0
      let totalWaitTime = 0
      let connectRes: any = null
      let lastState = 'unknown'
      let hasValidQr = false

      while (totalWaitTime < 15000) {
        attempt++

        connectRes = await fetchUazapi(`/instance/connect/${cleanInstanceName}`, {
          method: 'POST',
          headers: connectHeaders,
          body: JSON.stringify({ instance: cleanInstanceName }),
        })

        const state =
          connectRes?.parsedBody?.instance?.state || connectRes?.parsedBody?.state || 'unknown'
        const extractedQr = extractQrCode(connectRes?.parsedBody)

        console.log(`[CONNECT] State transition: ${lastState} -> ${state}`)
        lastState = state

        if (extractedQr) {
          hasValidQr = true
          break
        }

        if (state === 'open' || state === 'connected') {
          break
        }

        if (state === 'connecting' || connectRes.status === 405 || !extractedQr) {
          if (totalWaitTime + 3000 > 15000) break
          console.log(
            `[CONNECT] Attempt ${attempt} returned state '${state}' or 405 or null QR, retrying in 3s...`,
          )
          await new Promise((resolve) => setTimeout(resolve, 3000))
          totalWaitTime += 3000
        } else {
          if (connectRes.status === 404 || connectRes.status === 500) {
            if (totalWaitTime + 3000 > 15000) break
            console.log(
              `[CONNECT] Attempt ${attempt} failed with ${connectRes.status}, retrying in 3s...`,
            )
            await new Promise((resolve) => setTimeout(resolve, 3000))
            totalWaitTime += 3000
          } else {
            break
          }
        }
      }

      return connectRes
    }

    if (action === 'check_or_create') {
      let qrcode = null
      let status = 'connecting'
      let returnedToken = existingInstance?.instance_token
      let returnedId = existingInstance?.instance_external_id || instanceName

      let needsInit = true

      if (existingInstance && uazapiInstanceId) {
        if (!returnedToken) {
          return new Response(
            JSON.stringify({ error: 'Instance token not configured', code: 'TOKEN_MISSING' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          )
        }
        console.log(
          `[CHECK_OR_CREATE] checking database -> found existing name -> calling status for ${uazapiInstanceId}`,
        )
        const stateRes = await fetchUazapi(`/instance/status/${uazapiInstanceId}`, {
          method: 'GET',
          headers: getApiHeaders(returnedToken, uazapiInstanceId),
        })

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

        if (
          stateRes.status === 401 ||
          stateRes.status === 403 ||
          stateRes.parsedBody?.message === 'Unauthorized' ||
          stateRes.parsedBody?.error === 'Unauthorized'
        ) {
          return new Response(
            JSON.stringify({
              error: 'Erro de Autenticação: Verifique seu Token e Instance ID nas configurações.',
              code: 'UNAUTHORIZED',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 401,
            },
          )
        }
        if (
          stateRes.ok &&
          stateRes.parsedBody &&
          !stateRes.parsedBody.error &&
          stateRes.parsedBody.message !== 'Instance not found'
        ) {
          needsInit = false
        } else {
          if (existingInstance.server_url && existingInstance.instance_token) {
            console.log(
              `[CHECK_OR_CREATE] Uazapi returned not found/error for ${uazapiInstanceId}. Manual config exists, skipping init.`,
            )
            return new Response(
              JSON.stringify({
                error: 'Instância não encontrada na Uazapi com as credenciais fornecidas.',
                code: 'INSTANCE_NOT_FOUND',
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
              },
            )
          }
          console.log(
            `[CHECK_OR_CREATE] Uazapi returned not found/error for ${uazapiInstanceId}. Will re-initialize with same name.`,
          )
        }
      } else {
        console.log(`[CHECK_OR_CREATE] checking database -> no existing name found`)
      }

      return new Response(
        JSON.stringify({
          error:
            'Criação ou inicialização de novas instâncias foi desabilitada. Use o modo de status.',
          code: 'CREATION_DISABLED',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )

      const instanceData = {
        user_id: user.id,
        instance_name: instanceName,
        status: status,
        qrcode: qrcode,
        last_connection:
          status === 'open' || status === 'connected' ? new Date().toISOString() : null,
        instance_token: returnedToken,
        instance_external_id: returnedId,
        server_url: rawUazapiUrl,
        updated_at: new Date().toISOString(),
      }

      let resultInstance

      if (existingInstance) {
        const { data } = await supabaseAdmin
          .from('whatsapp_instances')
          .update(instanceData)
          .eq('id', existingInstance.id)
          .select()
          .single()
        resultInstance = data
      } else {
        const { data } = await supabaseAdmin
          .from('whatsapp_instances')
          .upsert(instanceData, { onConflict: 'user_id' })
          .select()
          .single()
        resultInstance = data
      }

      const safeInstance = {
        id: resultInstance.id,
        user_id: resultInstance.user_id,
        status: resultInstance.status,
        qrcode: resultInstance.qrcode,
        last_connection: resultInstance.last_connection,
        phone: resultInstance.phone,
        instance_name: resultInstance.instance_name,
        instance_token: resultInstance.instance_token,
        server_url: resultInstance.server_url,
      }

      return new Response(
        JSON.stringify({
          success: true,
          instance: safeInstance,
          uazapiUrl,
          is_connecting: status === 'connecting',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else if (action === 'get_status' || action === 'connect' || action === 'force_sync') {
      const returnedToken = existingInstance?.instance_token

      if (!returnedToken) {
        return new Response(
          JSON.stringify({ error: 'Instance token not configured', code: 'TOKEN_MISSING' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }

      if (action === 'force_sync') {
        try {
          await fetchUazapi(
            `/instance/logout/${sanitizeInstanceName(uazapiInstanceId as string)}`,
            {
              method: 'DELETE',
              headers: getApiHeaders(returnedToken, uazapiInstanceId as string),
            },
          )
        } catch (e) {}
      }

      if (action === 'connect' || action === 'force_sync') {
        await connectInstance(uazapiInstanceId as string, returnedToken)
        await setWebhook(uazapiInstanceId as string, returnedToken)
      } else {
        await setWebhook(uazapiInstanceId as string, returnedToken)
      }

      const stateRes = await fetchUazapi(`/instance/status/${uazapiInstanceId}`, {
        method: 'GET',
        headers: getApiHeaders(returnedToken, uazapiInstanceId),
      })

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

          // As per specification: do not call any POST endpoints like connectInstance.
          // Only perform GET status. If QR code is not in status, it remains disconnected.

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

          const safeInstance = {
            id: data.id,
            user_id: data.user_id,
            status: data.status,
            qrcode: data.qrcode,
            last_connection: data.last_connection,
            phone: data.phone,
            instance_name: data.instance_name,
            instance_token: data.instance_token,
            server_url: data.server_url,
          }
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
              last_error: stateRes.parsedBody?.error || 'Instance not found',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingInstance.id)
            .select()
            .single()

          const safeInstance = {
            id: data.id,
            user_id: data.user_id,
            status: data.status,
            qrcode: data.qrcode,
            last_connection: data.last_connection,
            phone: data.phone,
            instance_name: data.instance_name,
            instance_token: data.instance_token,
            server_url: data.server_url,
          }
          return new Response(
            JSON.stringify({
              success: true,
              error: stateRes.parsedBody?.error || 'Instance not found',
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
            success: true,
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
          JSON.stringify({ error: 'Instance token not configured', code: 'TOKEN_MISSING' }),
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

      const cleanName = sanitizeInstanceName(uazapiInstanceId!)
      const sendRes = await fetchUazapi(`/message/sendText/${cleanName}`, {
        method: 'POST',
        headers: getApiHeaders(returnedToken, cleanName),
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
      })

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
          JSON.stringify({ error: 'Instance token not configured', code: 'TOKEN_MISSING' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          },
        )
      }

      const cleanName = sanitizeInstanceName(uazapiInstanceId!)
      const chatsRes = await fetchUazapi(`/chat/findChats/${cleanName}`, {
        method: 'GET',
        headers: getApiHeaders(returnedToken, cleanName),
      })

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
            await supabaseAdmin.from('conversations').upsert(
              {
                instance_id: existingInstance.id,
                contact_id: contact.id,
                last_message: lastMessage || 'Mídia/Outro',
                unread_count: unreadCount,
                updated_at: timestamp,
              },
              { onConflict: 'instance_id, contact_id' },
            )
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
        if (returnedToken || globalAdminToken) {
          const cleanName = sanitizeInstanceName(uazapiInstanceId!)
          await fetchUazapi(`/instance/logout/${cleanName}`, {
            method: 'DELETE',
            headers: getApiHeaders(returnedToken || globalAdminToken, cleanName),
          })
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
