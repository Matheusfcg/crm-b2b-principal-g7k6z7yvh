import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const sharedCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, instance, instance_id, accept',
}

const getCorsHeaders = (origin: string | null) => {
  const allowOrigin = origin || '*'
  return { ...sharedCorsHeaders, 'Access-Control-Allow-Origin': allowOrigin }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  // Tratamento de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  // Validação de Método: Aceita explicitamente apenas requisições POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não suportado. Apenas requisições POST são aceitas.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Função de fetch blindada contra erros de body e content-type
    const fetchUazapi = async (path: string, options: RequestInit = {}, uazapiUrl: string) => {
      const url = `${uazapiUrl}${path}`
      const headers: Record<string, string> = {
        ...((options.headers as Record<string, string>) || {}),
      }

      if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json'
      }

      const fetchOptions: RequestInit = { ...options, headers }

      // GARANTIA: Se for GET, remove o body.
      if (fetchOptions.method === 'GET') {
        delete fetchOptions.body
      }

      console.log(`[DEBUG] Request: ${fetchOptions.method || 'GET'} ${url}`)
      const res = await fetch(url, fetchOptions)

      // Resiliência no tratamento da resposta, evitando crash em JSONs vazios (como status 204)
      const text = await res.text()
      let parsedBody: any = {}

      if (text && text.trim() !== '') {
        try {
          parsedBody = JSON.parse(text)
        } catch (e) {
          parsedBody = { data: text } // Fallback para text/plain
        }
      }

      return { ok: res.ok, status: res.status, parsedBody }
    }

    let reqBody: any = {}
    try {
      reqBody = await req.json()
    } catch (e) {
      console.error('[DEBUG] Erro ao parsear JSON do body:', e)
    }

    const action = reqBody?.action
    const instanceId = reqBody?.instanceId
    const instanceName =
      reqBody?.instanceName || reqBody?.instance_name || instanceId || 'rab2f9f17b6c912'
    const uazapiUrl = 'https://apiwhatsvexaview.uazapi.com'
    const token = reqBody?.token || Deno.env.get('UAZAPI_TOKEN') || ''

    if (!action) {
      return new Response(JSON.stringify({ error: 'Action não reconhecida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    switch (action) {
      case 'force_sync':
      case 'connect': {
        const pathAction = action === 'force_sync' ? 'sync' : action

        // CRUCIAL: Requisição POST para sync/connect SEM BODY para evitar erros 404/405 do provider
        const options: RequestInit = {
          method: 'POST',
          headers: { apikey: token },
        }
        delete options.body

        const res = await fetchUazapi(`/instance/${pathAction}/${instanceName}`, options, uazapiUrl)

        if (action === 'connect' && res.ok && res.parsedBody?.base64) {
          await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              qrcode: res.parsedBody.base64,
              status: 'connecting',
              updated_at: new Date().toISOString(),
            })
            .eq('instance_name', instanceName)
        }

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      case 'delete': {
        const res = await fetchUazapi(
          `/instance/delete/${instanceName}`,
          { method: 'DELETE', headers: { apikey: token } },
          uazapiUrl,
        )

        if (res.ok) {
          await supabaseAdmin
            .from('whatsapp_instances')
            .update({
              status: 'disconnected',
              qrcode: null,
              phone: null,
              updated_at: new Date().toISOString(),
            })
            .eq('instance_name', instanceName)
        }

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      case 'get_status': {
        const res = await fetchUazapi(
          `/instance/connectionStatus/${instanceName}`,
          { method: 'GET', headers: { apikey: token } },
          uazapiUrl,
        )

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      default: {
        return new Response(JSON.stringify({ error: 'Action não reconhecida' }), {
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
