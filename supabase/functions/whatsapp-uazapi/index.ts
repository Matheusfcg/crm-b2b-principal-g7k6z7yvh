import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

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

    const action = reqBody?.action
    const instanceId = reqBody?.instanceId
    const instanceName = reqBody?.instanceName || reqBody?.instance_name

    if (!action || (!instanceId && !instanceName)) {
      return new Response(
        JSON.stringify({ error: 'Action e instanceId (ou instanceName) são obrigatórios.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let query = supabaseAdmin.from('whatsapp_instances').select('*')
    if (instanceId) {
      query = query.eq('id', instanceId)
    } else {
      query = query.eq('instance_name', instanceName)
    }

    const { data: instances, error: fetchError } = await query.limit(1)

    if (fetchError || !instances || instances.length === 0) {
      return new Response(
        JSON.stringify({
          code: 'INSTANCE_CONFIG_NOT_FOUND',
          error: 'Instância não encontrada no banco de dados.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const instanceRecord = instances[0]
    const serverUrl = instanceRecord.server_url || 'https://api.uazapi.com'
    const token = instanceRecord.instance_token

    if (!token) {
      return new Response(
        JSON.stringify({
          code: 'UAZAPI_TOKEN_MISSING',
          error: 'Token da instância não configurado.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const fetchUazapi = async (path: string, options: RequestInit = {}) => {
      const url = `${serverUrl.replace(/\/$/, '')}${path}`
      const headers: Record<string, string> = {
        token: token,
        ...((options.headers as Record<string, string>) || {}),
      }

      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }

      const fetchOptions: RequestInit = { ...options, headers }

      if (fetchOptions.method === 'GET' || fetchOptions.method === 'HEAD') {
        delete fetchOptions.body
      }

      console.log(`[DEBUG] Request: ${fetchOptions.method || 'GET'} ${url}`)

      try {
        const res = await fetch(url, fetchOptions)
        const text = await res.text()
        let parsedBody: any = {}

        if (text && text.trim() !== '') {
          try {
            parsedBody = JSON.parse(text)
          } catch (e) {
            parsedBody = { data: text }
          }
        }

        return { ok: res.ok, status: res.status, parsedBody }
      } catch (err: any) {
        console.error(`[DEBUG] Erro na requisição para ${url}:`, err)
        return {
          ok: false,
          status: 500,
          parsedBody: { error: err.message || 'Erro de comunicação com o provedor' },
        }
      }
    }

    const handleUazapiError = async (res: any) => {
      if (res.status === 401) {
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({ status: 'unauthorized', last_error: 'Token inválido ou expirado' })
          .eq('id', instanceRecord.id)
        return new Response(JSON.stringify({ code: 'UNAUTHORIZED', error: 'Não autorizado' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (res.status === 404) {
        await supabaseAdmin
          .from('whatsapp_instances')
          .update({ status: 'not_found', last_error: 'Instância não encontrada na Uazapi' })
          .eq('id', instanceRecord.id)
        return new Response(
          JSON.stringify({ code: 'INSTANCE_NOT_FOUND', error: 'Instância não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
      return new Response(
        JSON.stringify(res.parsedBody || { error: 'Erro na integração com Uazapi' }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    switch (action) {
      case 'connect': {
        const res = await fetchUazapi(`/instance/connect`, {
          method: 'POST',
          body: JSON.stringify({ browser: 'auto' }),
        })

        if (res.ok && res.parsedBody?.base64) {
          const qrcode = res.parsedBody.base64
          await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              qrcode: qrcode,
              status: 'connecting',
              last_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', instanceRecord.id)

          return new Response(
            JSON.stringify({
              instance: {
                ...instanceRecord,
                status: 'connecting',
                qrcode: qrcode,
                last_error: null,
              },
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }

        if (!res.ok) return handleUazapiError(res)

        return new Response(JSON.stringify(res.parsedBody || { success: true }), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'force_sync': {
        const res = await fetchUazapi(`/instance/status`, { method: 'GET' })

        if (res.ok) {
          const status = res.parsedBody?.status || res.parsedBody?.state || 'disconnected'
          const qrcode = res.parsedBody?.qrcode || res.parsedBody?.base64 || null

          let dbStatus = 'disconnected'
          let updateData: any = { updated_at: new Date().toISOString() }

          if (['connected', 'open', 'loggedIn'].includes(status.toLowerCase())) {
            dbStatus = 'connected'
            updateData.status = dbStatus
            updateData.qrcode = null
            updateData.last_connection = new Date().toISOString()
          } else if (['connecting', 'qrcode'].includes(status.toLowerCase())) {
            dbStatus = 'connecting'
            updateData.status = dbStatus
            if (qrcode) updateData.qrcode = qrcode
          } else {
            updateData.status = dbStatus
          }

          await supabaseAdmin
            .from('whatsapp_instances')
            .update(updateData)
            .eq('id', instanceRecord.id)

          return new Response(
            JSON.stringify({
              instance: {
                ...instanceRecord,
                status: dbStatus,
                qrcode: updateData.qrcode || null,
                last_connection: updateData.last_connection || instanceRecord.last_connection,
              },
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }

        if (!res.ok) return handleUazapiError(res)

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'send_message': {
        const number = reqBody.number || reqBody.remoteJid
        const text = reqBody.text || reqBody.message

        const res = await fetchUazapi(`/send/text`, {
          method: 'POST',
          body: JSON.stringify({ number, text }),
        })

        if (!res.ok) return handleUazapiError(res)

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'get_conversations': {
        const res = await fetchUazapi(`/chat/find`, {
          method: 'POST',
          body: JSON.stringify({ sort: '-wa_lastMsgTimestamp', limit: 50, offset: 0 }),
        })

        if (!res.ok) return handleUazapiError(res)

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'setup_webhook': {
        const webhookUrl =
          reqBody.webhookUrl || `${Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-uazapi`
        const res = await fetchUazapi(`/webhook`, {
          method: 'POST',
          body: JSON.stringify({
            enabled: true,
            url: webhookUrl,
            events: ['messages', 'connection'],
            excludeMessages: ['wasSentByApi'],
          }),
        })

        if (!res.ok) return handleUazapiError(res)

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default: {
        return new Response(JSON.stringify({ error: 'Action não reconhecida.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
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
