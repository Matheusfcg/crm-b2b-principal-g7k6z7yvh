import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

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

    let reqBody: any = {}
    try {
      reqBody = await req.json()
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
    const token = reqBody?.token || Deno.env.get('UAZAPI_TOKEN') || ''

    if (!action) {
      return new Response(JSON.stringify({ error: 'Action não reconhecida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Função de fetch blindada contra erros de comunicação
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

        // Uso de GET em vez de POST para sync/connect para evitar erros 405 Method Not Allowed do provider
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

        // Para evitar repassar erro 405 e quebrar a interface, mapeia para 200
        const returnStatus = res.status === 405 ? 200 : res.status

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

        const returnStatus = res.status === 405 ? 200 : res.status

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.ok ? 200 : returnStatus,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      case 'get_status': {
        const res = await fetchUazapi(`/instance/connectionStatus/${instanceName}`, {
          method: 'GET',
        })

        const returnStatus = res.status === 405 ? 200 : res.status

        return new Response(JSON.stringify(res.parsedBody || {}), {
          status: res.ok ? 200 : returnStatus,
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
