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

    const rawUazapiUrl = Deno.env.get('UAZAPI_SERVER_URL') || 'https://free.uazapi.com'
    const uazapiKey = Deno.env.get('UAZAPI_ADMIN_TOKEN') || ''

    const uazapiUrl = rawUazapiUrl.trim().replace(/\/$/, '')
    const instanceName = `user_${user.id.replace(/[^a-zA-Z0-9]/g, '')}`

    const apiHeaders = {
      'Content-Type': 'application/json',
      admintoken: uazapiKey,
    }

    const fetchUazapi = async (path: string, options: RequestInit = {}) => {
      const url = `${uazapiUrl}${path}`
      const method = options.method || 'GET'

      console.log(`\n=== UAZAPI REQUEST ===`)
      console.log(`URL called: ${url}`)
      console.log(`HTTP Method: ${method}`)
      console.log(`Request Payload: ${options.body || 'None'}`)

      const res = await fetch(url, { ...options, headers: apiHeaders })

      const status = res.status
      const text = await res.text()

      let parsedBody: any = text
      try {
        if (text) parsedBody = JSON.parse(text)
      } catch (e) {}

      console.log(`\n=== UAZAPI RESPONSE ===`)
      console.log(`HTTP Status returned: ${status}`)
      console.log(
        `Response Body: ${typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)}`,
      )
      console.log(`=======================\n`)

      return { ok: res.ok, status, text, parsedBody }
    }

    if (action === 'create') {
      const createRes = await fetchUazapi('/instance/create', {
        method: 'POST',
        body: JSON.stringify({ instanceName }),
      })

      let qrcode = null
      let status = 'connecting'

      if (createRes.ok && createRes.parsedBody?.qrcode?.base64) {
        qrcode = createRes.parsedBody.qrcode.base64
      } else if (createRes.ok && createRes.parsedBody?.qrcode) {
        qrcode = createRes.parsedBody.qrcode
      }

      if (!qrcode) {
        const connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, { method: 'GET' })
        if (connectRes.ok) {
          const apiData = connectRes.parsedBody
          qrcode = apiData?.qrcode?.base64 || apiData?.qrcode || apiData?.base64 || null
          status = apiData?.instance?.state || apiData?.state || 'connecting'
        }
      }

      if (qrcode && typeof qrcode === 'string' && !qrcode.startsWith('data:image')) {
        qrcode = `data:image/png;base64,${qrcode}`
      }

      const instanceData = {
        user_id: user.id,
        instance_name: instanceName,
        status: status,
        qrcode: qrcode,
        last_connection: status === 'open' ? new Date().toISOString() : null,
      }

      const { data: existing } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      let resultInstance
      if (existing) {
        const { data } = await supabase
          .from('whatsapp_instances')
          .update(instanceData)
          .eq('id', existing.id)
          .select()
          .single()
        resultInstance = data
      } else {
        const { data } = await supabase
          .from('whatsapp_instances')
          .insert(instanceData)
          .select()
          .single()
        resultInstance = data
      }

      return new Response(JSON.stringify({ success: true, instance: resultInstance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'connect') {
      const connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, { method: 'GET' })
      let qrcode = null
      let status = 'connecting'

      if (connectRes.ok) {
        const apiData = connectRes.parsedBody
        qrcode = apiData?.qrcode?.base64 || apiData?.qrcode || apiData?.base64 || null
        if (qrcode && typeof qrcode === 'string' && !qrcode.startsWith('data:image')) {
          qrcode = `data:image/png;base64,${qrcode}`
        }
        status = apiData?.instance?.state || apiData?.state || 'connecting'
      }

      const { data: updated } = await supabase
        .from('whatsapp_instances')
        .update({ qrcode, status })
        .eq('user_id', user.id)
        .select()
        .single()

      return new Response(JSON.stringify({ success: true, instance: updated }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'status') {
      const stateRes = await fetchUazapi(`/instance/connectionState/${instanceName}`, {
        method: 'GET',
      })
      if (stateRes.ok) {
        const stateData = stateRes.parsedBody
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
        return new Response(
          JSON.stringify({ error: 'Failed to get state', details: stateRes.parsedBody }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: stateRes.status === 401 ? 401 : stateRes.status === 404 ? 404 : 400,
          },
        )
      }
    } else if (action === 'delete') {
      try {
        await fetchUazapi(`/instance/logout/${instanceName}`, { method: 'DELETE' })
      } catch (err: any) {
        console.error('Erro ao fazer logout na instancia:', err)
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
