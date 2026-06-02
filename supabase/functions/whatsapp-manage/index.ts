import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

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

    const action = body.action

    const rawUazapiUrl = Deno.env.get('UAZAPI_SERVER_URL') || 'https://free.uazapi.com'
    const uazapiKey = Deno.env.get('UAZAPI_ADMIN_TOKEN') || ''

    const uazapiUrl = rawUazapiUrl.trim().replace(/\/$/, '')
    const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').trim().replace(/\/$/, '')
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`

    const instanceName = `user_${user.id.replace(/[^a-zA-Z0-9]/g, '')}`

    const apiHeaders = {
      'Content-Type': 'application/json',
      admintoken: uazapiKey,
    }

    const maskToken = (token: string) => {
      if (!token) return ''
      if (token.length <= 8) return '***'
      return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`
    }

    const fetchUazapi = async (url: string, options: RequestInit = {}) => {
      const method = options.method || 'GET'
      const safeHeaders: Record<string, string> = { ...apiHeaders }
      if (safeHeaders['admintoken']) {
        safeHeaders['admintoken'] = maskToken(safeHeaders['admintoken'])
      }

      console.log(`\n=== UAZAPI REQUEST ===`)
      console.log(`Method: ${method}`)
      console.log(`URL: ${url}`)
      console.log(`Headers: ${JSON.stringify(safeHeaders)}`)
      if (options.body) {
        console.log(`Body: ${options.body}`)
      }
      console.log(`======================\n`)

      const res = await fetch(url, { ...options, headers: apiHeaders })

      const status = res.status
      const text = await res.text()

      let parsedBody: any = text
      try {
        if (text) parsedBody = JSON.parse(text)
      } catch (e) {}

      console.log(`\n=== UAZAPI RESPONSE ===`)
      console.log(`Status: ${status}`)
      console.log(
        `Body: ${typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)}`,
      )
      console.log(`=======================\n`)

      return { ok: res.ok, status, text, parsedBody }
    }

    if (action !== 'diagnostic') {
      const validationRes = await fetchUazapi(`${uazapiUrl}/instance/fetchInstances`, {
        method: 'GET',
      })
      if (!validationRes.ok) {
        return new Response(
          JSON.stringify({
            error: `Pre-flight authentication validation failed. Uazapi returned ${validationRes.status}`,
            details: validationRes.parsedBody,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: validationRes.status === 401 ? 401 : 400,
          },
        )
      }
    }

    if (action === 'diagnostic') {
      const maskedToken = maskToken(uazapiKey)
      const diagnosticLogs: any[] = []

      const logDiagnostic = (
        step: string,
        url: string,
        headers: any,
        status: number,
        body: any,
      ) => {
        const safeHeaders = { ...headers }
        if (safeHeaders.admintoken) safeHeaders.admintoken = maskedToken

        const logEntry = {
          step,
          url,
          headers: safeHeaders,
          status,
          body,
        }
        console.log(`[Diagnostic] ${step}:`, JSON.stringify(logEntry, null, 2))
        diagnosticLogs.push(logEntry)
      }

      const headerConfigurations = [
        {
          name: 'admintoken',
          headers: { 'Content-Type': 'application/json', admintoken: uazapiKey },
        },
      ]

      for (const config of headerConfigurations) {
        try {
          const fetchUrl = `${uazapiUrl}/instance/fetchInstances`
          const res = await fetch(fetchUrl, { headers: config.headers })
          const text = await res.text()
          let jsonBody: any = text
          try {
            jsonBody = JSON.parse(text)
          } catch (e) {}
          logDiagnostic(
            `Fetch Instances (${config.name})`,
            fetchUrl,
            config.headers,
            res.status,
            jsonBody,
          )
        } catch (err: any) {
          logDiagnostic(
            `Fetch Instances (${config.name}) - ERROR`,
            `${uazapiUrl}/instance/fetchInstances`,
            config.headers,
            500,
            err.message,
          )
        }
      }

      try {
        const fetchUrl = `${uazapiUrl}/instance/connectionState/test`
        const res = await fetch(fetchUrl, { headers: apiHeaders })
        const text = await res.text()
        let jsonBody: any = text
        try {
          jsonBody = JSON.parse(text)
        } catch (e) {}
        logDiagnostic(`Connection State (test)`, fetchUrl, apiHeaders, res.status, jsonBody)
      } catch (err: any) {
        logDiagnostic(
          `Connection State (test) - ERROR`,
          `${uazapiUrl}/instance/connectionState/test`,
          apiHeaders,
          500,
          err.message,
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Diagnostic completed',
          logs: diagnosticLogs,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else if (action === 'sync') {
      try {
        const chatsRes = await fetchUazapi(`${uazapiUrl}/chat/findChats/${instanceName}`, {
          method: 'GET',
        })
        if (chatsRes.ok) {
          const chats = chatsRes.parsedBody

          const { data: instance } = await supabase
            .from('whatsapp_instances')
            .select('id')
            .eq('instance_name', instanceName)
            .single()

          if (instance && Array.isArray(chats)) {
            for (const chat of chats.slice(0, 50)) {
              const remoteJid = chat.id || chat.remoteJid
              const pushName = chat.name || chat.pushName || 'Contato'
              const profilePic = chat.profilePictureUrl || chat.profilePicUrl || ''
              const unreadCount = chat.unreadCount || 0

              if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast')
                continue

              let { data: contact } = await supabase
                .from('contacts')
                .select('id')
                .eq('instance_id', instance.id)
                .eq('remote_jid', remoteJid)
                .single()

              if (!contact) {
                const { data: newContact } = await supabase
                  .from('contacts')
                  .insert({
                    instance_id: instance.id,
                    remote_jid: remoteJid,
                    push_name: pushName,
                    profile_picture: profilePic,
                  })
                  .select('id')
                  .single()
                contact = newContact
              } else if (profilePic) {
                await supabase
                  .from('contacts')
                  .update({ profile_picture: profilePic, push_name: pushName })
                  .eq('id', contact.id)
              }

              if (contact) {
                let { data: conversation } = await supabase
                  .from('conversations')
                  .select('id')
                  .eq('instance_id', instance.id)
                  .eq('contact_id', contact.id)
                  .single()
                if (!conversation) {
                  await supabase.from('conversations').insert({
                    instance_id: instance.id,
                    contact_id: contact.id,
                    unread_count: unreadCount,
                    updated_at: new Date(
                      chat.timestamp ? chat.timestamp * 1000 : Date.now(),
                    ).toISOString(),
                    last_message: chat.lastMessage?.message?.conversation || '',
                  })
                }
              }
            }
          }
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }
    } else if (action === 'send') {
      const { number, text } = body
      if (!number || !text) {
        return new Response(JSON.stringify({ error: 'Número e texto são obrigatórios' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      try {
        const sendRes = await fetchUazapi(`${uazapiUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          body: JSON.stringify({ number, text, delay: 1000 }),
        })
        if (!sendRes.ok) {
          return new Response(
            JSON.stringify({
              error: `Erro ao enviar mensagem: ${sendRes.status}`,
              details: sendRes.parsedBody,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          )
        }
        return new Response(JSON.stringify({ success: true, data: sendRes.parsedBody }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } catch (apiErr: any) {
        return new Response(JSON.stringify({ error: `Falha de rede: ${apiErr.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        })
      }
    } else if (action === 'create-session' || action === 'create') {
      let apiData: any = {}

      const createPayload = {
        instanceName: instanceName,
        token: instanceName,
        qrcode: true,
        b64: true,
        integration: 'WHATSAPP-BAILEYS',
      }

      try {
        const stateRes = await fetchUazapi(
          `${uazapiUrl}/instance/connectionState/${instanceName}`,
          { method: 'GET' },
        )

        if (stateRes.ok) {
          const stateData = stateRes.parsedBody
          if (stateData?.instance?.state !== 'open' && stateData?.state !== 'open') {
            const connectRes = await fetchUazapi(`${uazapiUrl}/instance/connect/${instanceName}`, {
              method: 'GET',
            })
            if (connectRes.ok) {
              apiData = connectRes.parsedBody
            } else {
              apiData = stateData
            }
          } else {
            apiData = stateData
          }
        } else {
          console.warn(
            `Instance state failed (${stateRes.status}). Attempting to create instance explicitly as part of manual connection flow.`,
          )

          const apiRes = await fetchUazapi(`${uazapiUrl}/instance/create`, {
            method: 'POST',
            body: JSON.stringify(createPayload),
          })

          if (!apiRes.ok) {
            return new Response(
              JSON.stringify({
                error: `Falha ao criar instância. A Uazapi retornou o status ${apiRes.status}.`,
                details: apiRes.parsedBody,
                payload: createPayload,
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: apiRes.status === 401 ? 401 : 400,
              },
            )
          }

          apiData = apiRes.parsedBody
        }

        try {
          await fetchUazapi(`${uazapiUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
              url: webhookUrl,
              webhook_by_events: false,
              webhook_base64: false,
              events: [
                'APPLICATION_STARTUP',
                'QRCODE_UPDATED',
                'MESSAGES_UPSERT',
                'CONNECTION_UPDATE',
                'MESSAGES_UPDATE',
                'SEND_MESSAGE',
                'CHATS_UPSERT',
                'CHATS_SET',
              ],
            }),
          })
        } catch (webhookErr) {
          console.error('Webhook set error:', webhookErr)
        }
      } catch (apiErr: any) {
        return new Response(
          JSON.stringify({ error: `Falha de rede ao conectar com Uazapi: ${apiErr.message}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 502,
          },
        )
      }

      let qrcode =
        apiData?.qrcode?.base64 || apiData?.qrcode || apiData?.base64 || apiData?.code || null
      if (qrcode && typeof qrcode === 'string' && !qrcode.startsWith('data:image')) {
        qrcode = `data:image/png;base64,${qrcode}`
      }

      const status =
        apiData?.instance?.state || apiData?.state || apiData?.instance?.status || 'connecting'
      const phone = apiData?.instance?.owner || apiData?.owner || apiData?.number

      const { data: existingInstance } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      let resultInstance
      if (existingInstance) {
        const updateData: any = {
          instance_name: instanceName,
          status: status,
          qrcode: qrcode,
          last_connection: status === 'open' ? new Date().toISOString() : undefined,
        }
        if (phone) updateData.phone = phone

        const { data: updated, error } = await supabase
          .from('whatsapp_instances')
          .update(updateData)
          .eq('id', existingInstance.id)
          .select()
          .single()

        if (error) throw error
        resultInstance = updated
      } else {
        const insertData: any = {
          user_id: user.id,
          instance_name: instanceName,
          status: status,
          qrcode: qrcode,
          last_connection: status === 'open' ? new Date().toISOString() : null,
        }
        if (phone) insertData.phone = phone

        const { data: inserted, error } = await supabase
          .from('whatsapp_instances')
          .insert(insertData)
          .select()
          .single()

        if (error) {
          const { data: fallback, error: fallbackError } = await supabase
            .from('whatsapp_instances')
            .upsert(insertData, { onConflict: 'instance_name' })
            .select()
            .single()

          if (fallbackError) throw fallbackError
          resultInstance = fallback
        } else {
          resultInstance = inserted
        }
      }

      return new Response(JSON.stringify({ success: true, instance: resultInstance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'get-status') {
      try {
        const stateRes = await fetchUazapi(
          `${uazapiUrl}/instance/connectionState/${instanceName}`,
          { method: 'GET' },
        )
        if (stateRes.ok) {
          const stateData = stateRes.parsedBody
          const state = stateData?.instance?.state || stateData?.state
          const phone = stateData?.instance?.owner || stateData?.owner || stateData?.number

          const updateData: any = {
            status: state,
            last_connection: state === 'open' ? new Date().toISOString() : undefined,
          }
          if (phone) updateData.phone = phone

          const { data: updated } = await supabase
            .from('whatsapp_instances')
            .update(updateData)
            .eq('user_id', user.id)
            .select()
            .single()

          return new Response(JSON.stringify({ success: true, instance: updated, phone: phone }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        } else {
          return new Response(
            JSON.stringify({ error: 'Failed to get state', details: stateRes.parsedBody }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: stateRes.status,
            },
          )
        }
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }
    } else if (action === 'logout' || action === 'disconnect') {
      try {
        await fetchUazapi(`${uazapiUrl}/instance/logout/${instanceName}`, { method: 'DELETE' })
        // Intentionally not calling /instance/delete so it can be reused later.
      } catch (err: any) {
        console.error('Erro ao deletar instancia:', err)
      }

      const { error } = await supabase
        .from('whatsapp_instances')
        .update({
          status: 'disconnected',
          qrcode: null,
        })
        .eq('user_id', user.id)

      if (error) throw error
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
