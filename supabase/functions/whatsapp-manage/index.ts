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

    const rawUazapiUrl = Deno.env.get('UAZAPI_URL') || 'https://free.uazapi.com'
    const uazapiKey =
      Deno.env.get('UAZAPI_TOKEN') || 'ZaW1qwTEkuq7Ub1cBUuyMiK5bNSu3nnMQ9lh7klElc2clSRV8t'

    const uazapiUrl = rawUazapiUrl.trim().replace(/\/$/, '')
    const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').trim().replace(/\/$/, '')
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`

    const instanceName = `user_${user.id.replace(/[^a-zA-Z0-9]/g, '')}`

    const apiHeaders = {
      'Content-Type': 'application/json',
      apikey: uazapiKey,
      Authorization: `Bearer ${uazapiKey}`,
      'admin-token': uazapiKey,
      GlobalApiKey: uazapiKey,
    }

    const maskToken = (token: string) => {
      if (!token) return ''
      if (token.length <= 8) return '***'
      return `${token.substring(0, 4)}...${token.substring(token.length - 4)}`
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
        if (safeHeaders.apikey) safeHeaders.apikey = maskedToken
        if (safeHeaders.Authorization) safeHeaders.Authorization = `Bearer ${maskedToken}`
        if (safeHeaders['admin-token']) safeHeaders['admin-token'] = maskedToken
        if (safeHeaders.GlobalApiKey) safeHeaders.GlobalApiKey = maskedToken

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
          name: 'Bearer',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${uazapiKey}` },
        },
        { name: 'apikey', headers: { 'Content-Type': 'application/json', apikey: uazapiKey } },
        {
          name: 'admin-token',
          headers: { 'Content-Type': 'application/json', 'admin-token': uazapiKey },
        },
        {
          name: 'GlobalApiKey',
          headers: { 'Content-Type': 'application/json', GlobalApiKey: uazapiKey },
        },
        { name: 'All Combined', headers: apiHeaders },
      ]

      for (const config of headerConfigurations) {
        try {
          const fetchUrl = `${uazapiUrl}/instance/fetchInstances`
          const res = await fetch(fetchUrl, { headers: config.headers })
          const text = await res.text()
          let jsonBody = text
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
        let jsonBody = text
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

      const planNotes =
        'Uazapi Free Plan: Programmatic instance creation (/instance/create) might be restricted. If all tests return 401/403, the token might be invalid, or the free tier only allows dashboard creation. Verify endpoint path for the Free plan.'

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Diagnostic completed',
          notes: planNotes,
          logs: diagnosticLogs,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    } else if (action === 'sync') {
      try {
        const chatsRes = await fetch(`${uazapiUrl}/chat/findChats/${instanceName}`, {
          headers: apiHeaders,
        })
        if (chatsRes.ok) {
          const chats = await chatsRes.json()

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
        } else {
          console.error('Sync Error:', await chatsRes.text())
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
        const sendRes = await fetch(`${uazapiUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: apiHeaders,
          body: JSON.stringify({ number, text, delay: 1000 }),
        })
        const sendData = await sendRes.text()
        if (!sendRes.ok) {
          let details = sendData
          try {
            details = JSON.parse(sendData)
          } catch (e) {}
          return new Response(
            JSON.stringify({
              error: `Erro ao enviar mensagem: ${sendRes.status}`,
              details: details,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          )
        }
        let parsed = {}
        try {
          parsed = JSON.parse(sendData)
        } catch (e) {}
        return new Response(JSON.stringify({ success: true, data: parsed }), {
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
        const stateRes = await fetch(`${uazapiUrl}/instance/connectionState/${instanceName}`, {
          headers: apiHeaders,
        })

        if (stateRes.ok) {
          const stateText = await stateRes.text()
          try {
            const stateData = JSON.parse(stateText)
            if (stateData?.instance?.state !== 'open' && stateData?.state !== 'open') {
              const connectRes = await fetch(`${uazapiUrl}/instance/connect/${instanceName}`, {
                headers: apiHeaders,
              })
              if (connectRes.ok) {
                const connectText = await connectRes.text()
                apiData = JSON.parse(connectText)
              } else {
                console.error('Connect error:', await connectRes.text())
                apiData = stateData
              }
            } else {
              apiData = stateData
            }
          } catch (e) {
            console.error('Failed to parse state:', e)
          }
        } else {
          const stateErrText = await stateRes.text()
          console.warn(`Connection state not ok (${stateRes.status}):`, stateErrText)

          const apiRes = await fetch(`${uazapiUrl}/instance/create`, {
            method: 'POST',
            headers: apiHeaders,
            body: JSON.stringify(createPayload),
          })

          const resText = await apiRes.text()

          if (!apiRes.ok) {
            console.error('Create Instance Error:', apiRes.status, resText)
            let details = resText
            try {
              details = JSON.parse(resText)
            } catch (e) {}

            return new Response(
              JSON.stringify({
                error: `Falha ao criar instância. A Uazapi retornou o status ${apiRes.status}.`,
                details: details,
                payload: createPayload,
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: apiRes.status === 401 ? 401 : 400,
              },
            )
          }

          try {
            apiData = resText ? JSON.parse(resText) : {}
          } catch (e) {}
        }

        try {
          const webhookRes = await fetch(`${uazapiUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: apiHeaders,
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
          if (!webhookRes.ok) {
            console.error('Webhook set error status:', webhookRes.status, await webhookRes.text())
          }
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
        const stateRes = await fetch(`${uazapiUrl}/instance/connectionState/${instanceName}`, {
          headers: apiHeaders,
        })
        if (stateRes.ok) {
          const stateData = await stateRes.json()
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
          console.error('Get status error:', stateRes.status, await stateRes.text())
        }
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        })
      }
    } else if (action === 'logout' || action === 'disconnect') {
      try {
        await fetch(`${uazapiUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: apiHeaders,
        })

        await fetch(`${uazapiUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: apiHeaders,
        })
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
