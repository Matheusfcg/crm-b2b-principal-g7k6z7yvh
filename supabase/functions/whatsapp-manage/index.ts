import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Unauthorized')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const action = body.action

    const rawEvolutionUrl = Deno.env.get('EVOLUTION_API_URL')
    const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')

    if (!rawEvolutionUrl || !evolutionKey) {
      throw new Error(
        'EVOLUTION_API_URL and EVOLUTION_API_KEY env vars missing in Supabase Edge Functions',
      )
    }

    const evolutionUrl = rawEvolutionUrl.replace(/\/$/, '')
    const instanceName = user.id

    if (action === 'create') {
      let evoRes = await fetch(`${evolutionUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: evolutionKey,
        },
        body: JSON.stringify({
          instanceName: instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`,
          webhook_by_events: false,
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

      let evoData = await evoRes.json().catch(() => ({}))

      if (!evoRes.ok) {
        const connectRes = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
          headers: { apikey: evolutionKey },
        })
        if (connectRes.ok) {
          evoData = await connectRes.json()
        } else {
          throw new Error('Falha ao criar ou conectar à instância')
        }
      } else {
        await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: evolutionKey,
          },
          body: JSON.stringify({
            url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-webhook`,
            webhook_by_events: false,
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
      }

      let qrcode = evoData?.qrcode?.base64 || evoData?.qrcode || evoData?.base64 || null
      if (qrcode && typeof qrcode === 'string' && !qrcode.startsWith('data:image')) {
        qrcode = `data:image/png;base64,${qrcode}`
      }

      const status = evoData?.instance?.state || 'connecting'

      const { data: instance, error } = await supabase
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

      if (error) throw error

      return new Response(JSON.stringify({ success: true, instance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'disconnect') {
      await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: evolutionKey },
      })

      await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: evolutionKey },
      })

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

    throw new Error('Invalid action')
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
