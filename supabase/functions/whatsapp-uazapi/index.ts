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

    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    let instanceName =
      existingInstance?.instance_name || `crm_user_${user.id.replace(/[^a-zA-Z0-9]/g, '')}`

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
      const payload = options.body || 'None'

      console.log(`\n=== UAZAPI REQUEST ===`)
      console.log('URL:', url)
      console.log('METHOD:', method)
      console.log('PAYLOAD:', payload)

      const res = await fetch(url, { ...options, headers: apiHeaders })

      const status = res.status
      const text = await res.text()

      let parsedBody: any = text
      try {
        if (text) parsedBody = JSON.parse(text)
      } catch (e) {}

      const responseLog = typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)

      console.log(`\n=== UAZAPI RESPONSE ===`)
      console.log('URL:', url)
      console.log(`HTTP Status: ${status}`)
      console.log('RESPONSE:', responseLog)
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
      let qrcode = rawQrcode
      if (qrcode && typeof qrcode === 'string') {
        if (!qrcode.startsWith('data:image')) {
          qrcode = `data:image/png;base64,${qrcode}`
        }
      }
      return qrcode
    }

    if (action === 'create') {
      console.log('CREATE INSTANCE:', instanceName)
      console.log(`Checking if instance exists in Uazapi first...`)

      if (existingInstance?.status === 'not_found') {
        console.log('Cleaning up not_found instance before recreating...')
        await fetchUazapi(`/instance/logout/${instanceName}`, { method: 'DELETE' }).catch(() => {})
      }

      const createRes = await fetchUazapi('/instance/init', {
        method: 'POST',
        body: JSON.stringify({ instanceName, qrcode: true }),
      })

      if (
        !createRes.ok &&
        createRes.status !== 400 &&
        createRes.status !== 403 &&
        createRes.status !== 409
      ) {
        console.error('Failed to create instance, Uazapi response:', createRes.parsedBody)
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

      const returnedId =
        createRes.parsedBody?.instance?.id ||
        createRes.parsedBody?.id ||
        createRes.parsedBody?.instance?.instanceName ||
        createRes.parsedBody?.instanceName
      const returnedToken =
        createRes.parsedBody?.hash?.apikey ||
        createRes.parsedBody?.token ||
        createRes.parsedBody?.apikey ||
        null
      const externalId = createRes.parsedBody?.instance?.id || createRes.parsedBody?.id || null

      if (returnedId && typeof returnedId === 'string') {
        instanceName = returnedId
      }

      console.log('CHECK STATUS:', instanceName)
      let qrcode = extractQrCode(createRes.parsedBody)
      let status = 'connecting'

      if (!qrcode) {
        console.log('GET QRCODE:', instanceName)
        const connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, { method: 'GET' })

        if (connectRes.ok) {
          const apiData = connectRes.parsedBody
          qrcode = extractQrCode(apiData)
          status = apiData?.instance?.state || apiData?.state || 'connecting'
        }
      } else {
        console.log('GET QRCODE:', instanceName, '(Retrieved from init payload)')
      }

      const instanceData = {
        user_id: user.id,
        instance_name: instanceName,
        status: status,
        qrcode: qrcode,
        last_connection: status === 'open' ? new Date().toISOString() : null,
        instance_token: returnedToken || existingInstance?.instance_token,
        instance_external_id: externalId || existingInstance?.instance_external_id,
      }

      let resultInstance
      let dbError

      if (existingInstance) {
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .update(instanceData)
          .eq('id', existingInstance.id)
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
      console.log('GET QRCODE:', instanceName)
      const connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, { method: 'GET' })
      let qrcode = null
      let status = 'connecting'

      if (connectRes.ok) {
        const apiData = connectRes.parsedBody
        qrcode = extractQrCode(apiData)
        status = apiData?.instance?.state || apiData?.state || 'connecting'
      } else if (connectRes.status === 404) {
        status = 'not_found'
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
      console.log('CHECK STATUS:', instanceName)
      const stateRes = await fetchUazapi(`/instance/status/${instanceName}`, { method: 'GET' })
      if (stateRes.ok) {
        const stateData = stateRes.parsedBody
        const state =
          stateData?.instance?.state ||
          stateData?.state ||
          stateData?.stateConnection ||
          stateData?.status ||
          'connecting'
        const phone =
          stateData?.instance?.owner || stateData?.owner || stateData?.number || stateData?.phone

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
          .update({ status: 'not_found', qrcode: null })
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
