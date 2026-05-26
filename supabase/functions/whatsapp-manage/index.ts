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

    if (action === 'create') {
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
            console.error(`Payload sent:`, JSON.stringify(createPayload))

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
