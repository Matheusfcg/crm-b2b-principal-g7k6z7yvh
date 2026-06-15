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
        JSON.stringify({ error: 'Instância não encontrada no banco.', code: 'INSTANCE_NOT_FOUND' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const serverUrl = instanceData.server_url || 'https://api.uazapi.com'
    const token = instanceData.instance_token

    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'Token Uazapi não configurado para esta instância.',
          code: 'UAZAPI_TOKEN_MISSING',
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

    const handleUazapiErrors = (res: any) => {
      if (res.status === 401)
        return new Response(
          JSON.stringify({ code: 'UNAUTHORIZED', error: 'Token inválido ou expirado (401)' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      if (res.status === 404)
        return new Response(
          JSON.stringify({
            code: 'INSTANCE_NOT_FOUND',
            error: 'Instância não encontrada na Uazapi (404)',
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      if (res.status === 429)
        return new Response(
          JSON.stringify({
            code: 'RATE_LIMIT_REACHED',
            error: 'Limite de requisições ou instâncias atingido (429)',
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      return null
    }

    switch (action) {
      case 'get_conversations': {
        const res = await fetchUazapi(`/chat/find`, {
          method: 'POST',
          body: JSON.stringify({
            sort: '-wa_lastMsgTimestamp',
            limit: 50,
            offset: 0,
          }),
        })

        const errResp = handleUazapiErrors(res)
        if (errResp) return errResp

        return new Response(JSON.stringify(res.parsedBody || []), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'connect': {
        const res = await fetchUazapi(`/instance/connect`, {
          method: 'POST',
          body: JSON.stringify({
            browser: 'auto',
            timeout: 180000,
            keepAlive: true,
          }),
        })

        const errResp = handleUazapiErrors(res)
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

      case 'force_sync': {
        const res = await fetchUazapi(`/instance/status`, {
          method: 'GET',
        })

        const errResp = handleUazapiErrors(res)
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
            await supabaseAdmin
              .from('whatsapp_instances')
              .update({
                status: 'connecting',
                qrcode: qrcode || null,
                updated_at: new Date().toISOString(),
              })
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

        const errResp = handleUazapiErrors(res)
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
            excludeMessages: ['wasSentByApi'],
          }),
        })

        const errResp = handleUazapiErrors(res)
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
