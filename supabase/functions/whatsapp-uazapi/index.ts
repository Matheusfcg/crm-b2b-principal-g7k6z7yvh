import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

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

    console.log(`\n=== PROCESSING ACTION ===`)
    console.log(`Action: ${action}`)
    console.log(`Instance ID: ${instanceName}`)
    console.log(`User ID: ${user.id}`)
    console.log(`=========================\n`)

    const apiHeaders = {
      'Content-Type': 'application/json',
      apikey: uazapiKey,
      admintoken: uazapiKey,
    }

    const fetchUazapi = async (path: string, options: RequestInit = {}) => {
      const url = `${uazapiUrl}${path}`
      const method = options.method || 'GET'

      console.log(`\n=== UAZAPI REQUEST ===`)
      console.log(`URL: ${url}`)
      console.log(`METHOD: ${method}`)
      console.log(`PAYLOAD: ${options.body || 'None'}`)

      const res = await fetch(url, { ...options, headers: apiHeaders })

      const status = res.status
      const text = await res.text()

      let parsedBody: any = text
      try {
        if (text) parsedBody = JSON.parse(text)
      } catch (e) {}

      console.log(`\n=== UAZAPI RESPONSE ===`)
      console.log(`URL: ${url}`)
      console.log(`HTTP Status: ${status}`)
      console.log(
        `RESPONSE: ${typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)}`,
      )
      console.log(`=======================\n`)

      if (status === 404) {
        console.error(
          `[404 NOT FOUND] The endpoint ${method} ${url} returned 404. Check if the path or instanceName is correct.`,
        )
      }

      return { ok: res.ok, status, text, parsedBody }
    }

    const extractQrCode = (parsedBody: any) => {
      let rawQrcode =
        parsedBody?.base64 ||
        parsedBody?.qrcode?.base64 ||
        parsedBody?.qrcode ||
        parsedBody?.qr ||
        parsedBody?.code ||
        null
      console.log(`Extracted raw QR Code field length: ${rawQrcode ? rawQrcode.length : 0}`)
      let qrcode = rawQrcode
      if (qrcode && typeof qrcode === 'string') {
        if (!qrcode.startsWith('data:image')) {
          qrcode = `data:image/png;base64,${qrcode}`
        }
      }
      return qrcode
    }

    if (action === 'create') {
      const createRes = await fetchUazapi('/instance/create', {
        method: 'POST',
        body: JSON.stringify({ instanceName, qrcode: true }),
      })

      if (
        !createRes.ok &&
        createRes.status !== 400 &&
        createRes.status !== 403 &&
        createRes.status !== 409
      ) {
        return new Response(
          JSON.stringify({
            error: 'Failed to create instance in Uazapi',
            details: createRes.parsedBody,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 502,
          },
        )
      }

      let qrcode = extractQrCode(createRes.parsedBody)
      let status = 'connecting'

      if (!qrcode) {
        const connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, { method: 'GET' })
        if (connectRes.ok) {
          const apiData = connectRes.parsedBody
          qrcode = extractQrCode(apiData)
          status = apiData?.instance?.state || apiData?.state || 'connecting'
        }
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
      let dbError

      if (existing) {
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .update(instanceData)
          .eq('id', existing.id)
          .select()
          .single()
        resultInstance = data
        dbError = error
      } else {
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .upsert(instanceData, { onConflict: 'instance_name' })
          .select()
          .single()
        resultInstance = data
        dbError = error
      }

      if (dbError) {
        console.error('DB Error updating instance:', dbError)
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
        qrcode = extractQrCode(apiData)
        status = apiData?.instance?.state || apiData?.state || 'connecting'
      } else if (connectRes.status === 404) {
        status = 'disconnected'
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
        const state =
          stateData?.instance?.state ||
          stateData?.state ||
          stateData?.stateConnection ||
          'connecting'
        const phone = stateData?.instance?.owner || stateData?.owner || stateData?.number

        const updateData: any = {
          status: state,
          last_connection: state === 'open' ? new Date().toISOString() : undefined,
        }
        if (phone) updateData.phone = phone
        if (state === 'open') updateData.qrcode = null

        const { data: updated } = await supabase
          .from('whatsapp_instances')
          .update(updateData)
          .eq('user_id', user.id)
          .select()
          .single()

        return new Response(JSON.stringify({ success: true, instance: updated, phone: phone }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else if (stateRes.status === 404) {
        const { data: updated } = await supabase
          .from('whatsapp_instances')
          .update({ status: 'disconnected', qrcode: null })
          .eq('user_id', user.id)
          .select()
          .single()

        return new Response(
          JSON.stringify({ success: true, error: 'Instance not found', instance: updated }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to get state', details: stateRes.parsedBody }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: stateRes.status === 401 ? 401 : 400,
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
