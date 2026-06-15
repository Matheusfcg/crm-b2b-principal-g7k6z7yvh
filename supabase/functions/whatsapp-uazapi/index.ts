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

const sanitizeInstanceName = (name: string) =>
  name ? name.split('?')[0].split('&')[0].trim() : name

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin')
  const corsHeaders = getCorsHeaders(origin)

  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // FUNÇÃO DE FETCH BLINDADA
    const fetchUazapi = async (path: string, options: RequestInit = {}, uazapiUrl: string) => {
      const url = `${uazapiUrl}${path}`
      const fetchOptions: RequestInit = {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      }

      // GARANTIA: Se for GET, remove o body. Sem exceções.
      if (options.method === 'GET') delete fetchOptions.body

      console.log(`[DEBUG] Request: ${options.method || 'GET'} ${url}`)
      const res = await fetch(url, fetchOptions)
      const text = await res.text()
      let parsedBody: any = text
      try {
        parsedBody = JSON.parse(text)
      } catch (e) {}
      return { ok: res.ok, status: res.status, parsedBody }
    }

    let reqBody: any = {}
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        reqBody = await req.json()
      } catch (e) {}
    }

    const url = new URL(req.url)
    const routePath = url.pathname

    const action = reqBody?.action
    const instanceId =
      reqBody?.instanceId || reqBody?.instanceName || reqBody?.instance_name || 'rab2f9f17b6c912'
    const uazapiUrl = reqBody?.uazapiUrl || 'https://apiwhatsvexaview.uazapi.com'
    const token = reqBody?.token || Deno.env.get('UAZAPI_TOKEN') || ''

    if (action) {
      switch (action) {
        case 'force_sync': {
          const res = await fetchUazapi(
            `/instance/sync/${instanceId}`,
            { method: 'POST', headers: { apikey: token } },
            uazapiUrl,
          )
          return new Response(JSON.stringify(res.parsedBody), {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        case 'connect': {
          const res = await fetchUazapi(
            `/instance/connect/${instanceId}`,
            { method: 'GET', headers: { apikey: token } },
            uazapiUrl,
          )

          if (res.ok && res.parsedBody?.base64) {
            await supabaseAdmin
              .from('whatsapp_instances')
              .update({
                qrcode: res.parsedBody.base64,
                status: 'connecting',
                updated_at: new Date().toISOString(),
              })
              .eq('instance_name', instanceId)
          }

          return new Response(JSON.stringify(res.parsedBody), {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        case 'delete': {
          const res = await fetchUazapi(
            `/instance/delete/${instanceId}`,
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
              .eq('instance_name', instanceId)
          }

          return new Response(JSON.stringify(res.parsedBody), {
            status: res.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        default: {
          return new Response(JSON.stringify({ error: 'Action not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
      }
    }

    // ROTA DE STATUS (Exemplo de uso correto / Fallback)
    if (routePath.includes('/status')) {
      const res = await fetchUazapi(
        `/instance/status/${instanceId}`,
        { method: 'GET', headers: { apikey: token } },
        uazapiUrl,
      )

      return new Response(JSON.stringify(res.parsedBody), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Action not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
