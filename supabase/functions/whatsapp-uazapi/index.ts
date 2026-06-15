import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders as sharedCorsHeaders } from '../_shared/cors.ts'

const corsHeaders = {
  ...sharedCorsHeaders,
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
    const instanceName =
      reqBody?.instanceName || reqBody?.instance_name || instanceId || 'rab2f9f17b6c912'
    const uazapiUrl = 'https://apiwhatsvexaview.uazapi.com'
    // Hardcoded token as a temporary bypass of environment variable retrieval issues
    const token = reqBody?.token || '9shMWeQXKtmrtATw0IjUbAn2dHraVmLVubHVQK065MUDWPsUgp'

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action não reconhecida. Verifique o payload.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const fetchUazapi = async (path: string, options: RequestInit = {}) => {
      const url = `${uazapiUrl}${path}`
      const headers: Record<string, string> = {
        apikey: token,
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

    switch (action) {
      case 'force_sync':
      case 'connect': {
        const pathAction = action === 'force_sync' ? 'sync' : action

        const options: RequestInit = {
          method: 'GET',
        }

        const res = await fetchUazapi(`/instance/${pathAction}/${instanceName}`, options)

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

        const returnStatus = res.status === 405 || res.status === 404 ? 200 : res.status

        return new Response(JSON.stringify(res.parsedBody || { success: true }), {
          status: res.ok ? 200 : returnStatus,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      case 'delete': {
        const res = await fetchUazapi(`/instance/delete/${instanceName}`, { method: 'DELETE' })

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

        const returnStatus = res.status === 405 || res.status === 404 ? 200 : res.status

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.ok ? 200 : returnStatus,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      case 'get_status': {
        const res = await fetchUazapi(`/instance/connectionStatus/${instanceName}`, {
          method: 'GET',
        })

        const returnStatus = res.status === 405 || res.status === 404 ? 200 : res.status

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.ok ? 200 : returnStatus,
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
