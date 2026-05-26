import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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

    const rawEvolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!rawEvolutionUrl || !evolutionKey) {
      return new Response(
        JSON.stringify({
          error: 'Configuração da Evolution API ausente no backend (variáveis de ambiente).',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        },
      )
    }

    const evolutionUrl = rawEvolutionUrl.trim().replace(/\/$/, '')
    const supabaseUrl = (Deno.env.get('SUPABASE_URL') || '').trim().replace(/\/$/, '')
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`

    const instanceName = `user_${user.id.replace(/[^a-zA-Z0-9]/g, '')}`

    const evoHeaders = {
      'Content-Type': 'application/json',
      apikey: evolutionKey,
      Authorization: `Bearer ${evolutionKey}`,
    }

    if (action === 'sync') {
      try {
        const chatsRes = await fetch(`${evolutionUrl}/chat/findChats/${instanceName}`, {
          headers: evoHeaders,
        })
        if (chatsRes.ok) {
          const chats = await chatsRes.json()

          const { data: instance } = await supabase
            .from('whatsapp_instances')
            .select('id')
            .eq('instance_name', instanceName)
            .single()

          if (instance && Array.isArray(chats)) {
            // Process max 50 chats to avoid timeout in edge function
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
        const sendRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: evoHeaders,
          body: JSON.stringify({ number, text, delay: 1000 }),
        })
        const sendData = await sendRes.text()
        if (!sendRes.ok) {
          return new Response(
            JSON.stringify({
              error: `Erro ao enviar mensagem: ${sendRes.status}`,
              details: sendData,
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
      } catch (evoErr: any) {
        return new Response(JSON.stringify({ error: `Falha de rede: ${evoErr.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 502,
        })
      }
    } else if (action === 'create') {
      let evoData: any = {}

      const createPayload = {
        instanceName: instanceName,
        token: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }

      try {
        const stateRes = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
          headers: evoHeaders,
        })

        if (stateRes.ok) {
          const stateText = await stateRes.text()
          try {
            const stateData = JSON.parse(stateText)
            if (stateData?.instance?.state !== 'open' && stateData?.state !== 'open') {
              const connectRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
                headers: evoHeaders,
              })
              if (connectRes.ok) {
                const connectText = await connectRes.text()
                evoData = JSON.parse(connectText)
              } else {
                evoData = stateData
              }
            } else {
              evoData = stateData
            }
          } catch (e) {}
        } else {
          const evoRes = await fetch(`${evolutionUrl}/instance/create`, {
            method: 'POST',
            headers: evoHeaders,
            body: JSON.stringify(createPayload),
          })

          const resText = await evoRes.text()

          if (!evoRes.ok) {
            console.error(`Evolution API Error [${evoRes.status}] on create:`, resText)
            return new Response(
              JSON.stringify({
                error: `Falha ao criar instância. A Evolution API retornou o status ${evoRes.status}.`,
                details: resText.substring(0, 500),
                payload: createPayload,
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
              },
            )
          }

          try {
            evoData = resText ? JSON.parse(resText) : {}
          } catch (e) {}
        }

        try {
          await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: evoHeaders,
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
      } catch (evoErr: any) {
        return new Response(
          JSON.stringify({
            error: `Falha de rede ao conectar com Evolution API: ${evoErr.message}`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 502,
          },
        )
      }

      let qrcode =
        evoData?.qrcode?.base64 || evoData?.qrcode || evoData?.base64 || evoData?.code || null
      if (qrcode && typeof qrcode === 'string' && !qrcode.startsWith('data:image')) {
        qrcode = `data:image/png;base64,${qrcode}`
      }

      const status =
        evoData?.instance?.state || evoData?.state || evoData?.instance?.status || 'connecting'

      const { data: existingInstance } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      let resultInstance
      if (existingInstance) {
        const { data: updated, error } = await supabase
          .from('whatsapp_instances')
          .update({
            instance_name: instanceName,
            status: status,
            qrcode: qrcode,
            last_connection: status === 'open' ? new Date().toISOString() : undefined,
          })
          .eq('id', existingInstance.id)
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: `Erro ao atualizar banco: ${error.message}` }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            },
          )
        }
        resultInstance = updated
      } else {
        const { data: inserted, error } = await supabase
          .from('whatsapp_instances')
          .insert({
            user_id: user.id,
            instance_name: instanceName,
            status: status,
            qrcode: qrcode,
            last_connection: status === 'open' ? new Date().toISOString() : null,
          })
          .select()
          .single()

        if (error) {
          const { data: fallback, error: fallbackError } = await supabase
            .from('whatsapp_instances')
            .upsert(
              {
                user_id: user.id,
                instance_name: instanceName,
                status: status,
                qrcode: qrcode,
              },
              { onConflict: 'instance_name' },
            )
            .select()
            .single()

          if (fallbackError) {
            return new Response(
              JSON.stringify({ error: `Erro ao inserir no banco: ${fallbackError.message}` }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
              },
            )
          }
          resultInstance = fallback
        } else {
          resultInstance = inserted
        }
      }

      return new Response(JSON.stringify({ success: true, instance: resultInstance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'disconnect') {
      try {
        await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
          method: 'DELETE',
          headers: evoHeaders,
        })

        await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
          method: 'DELETE',
          headers: evoHeaders,
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
    return new Response(JSON.stringify({ error: err.message || 'Ocorreu um erro interno' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
