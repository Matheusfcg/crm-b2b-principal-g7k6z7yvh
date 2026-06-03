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

    const rawUazapiUrl =
      Deno.env.get('UAZAPI_BASE_URL') ||
      Deno.env.get('UAZAPI_SERVER_URL') ||
      'https://free.uazapi.com'
    const uazapiKey = Deno.env.get('UAZAPI_API_KEY') || Deno.env.get('UAZAPI_ADMIN_TOKEN') || ''
    const uazapiUrl = rawUazapiUrl.trim().replace(/\/$/, '')

    console.log(`[DB_CHECK] Fetching existing instance for user ${user.id}...`)
    const { data: existingInstance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log(`[DB_CHECK] Result: ${existingInstance ? 'Found' : 'Not found'}`)

    let instanceName =
      existingInstance?.instance_name || `user_${user.id.replace(/[^a-zA-Z0-9]/g, '')}`

    const apiHeaders = {
      'Content-Type': 'application/json',
      apikey: uazapiKey,
      admintoken: uazapiKey,
    }

    const fetchUazapi = async (path: string, options: RequestInit = {}) => {
      const url = `${uazapiUrl}${path}`
      const method = options.method || 'GET'
      const payload = options.body || 'None'

      console.log(`[UAZAPI_REQ] METHOD: ${method} URL: ${url} | BODY: ${payload}`)

      const res = await fetch(url, { ...options, headers: apiHeaders })
      const status = res.status
      const text = await res.text()

      let parsedBody: any = text
      try {
        if (text) parsedBody = JSON.parse(text)
      } catch (e) {}

      console.log(
        `[UAZAPI_RES] STATUS: ${status} | BODY: ${typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)}`,
      )

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

    if (action === 'check_or_create') {
      let qrcode = null
      let status = 'connecting'
      let returnedId = null
      let returnedToken = null
      let externalId = null

      if (existingInstance && existingInstance.status !== 'not_found') {
        console.log(`[SYNC_STATUS] Instance already exists in DB. Getting status from UAZAPI...`)
        const stateRes = await fetchUazapi(`/instance/status/${instanceName}`, { method: 'GET' })

        if (stateRes.ok) {
          const stateData = stateRes.parsedBody
          status =
            stateData?.instance?.state ||
            stateData?.state ||
            stateData?.stateConnection ||
            stateData?.status ||
            'connecting'

          if (status !== 'open') {
            const connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, {
              method: 'GET',
            })
            if (connectRes.ok) {
              qrcode = extractQrCode(connectRes.parsedBody)
              status =
                connectRes.parsedBody?.instance?.state || connectRes.parsedBody?.state || status
            }
          }
        } else if (stateRes.status === 404) {
          console.log(`[SYNC_STATUS] 404 Not Found from Uazapi, will recreate.`)
          status = 'not_found'
        }
      } else {
        status = 'not_found'
      }

      if (status === 'not_found') {
        console.log(`[SYNC_STATUS] Triggering instance creation in UAZAPI...`)

        if (existingInstance?.status === 'not_found') {
          await fetchUazapi(`/instance/logout/${instanceName}`, { method: 'DELETE' }).catch(
            () => {},
          )
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

        returnedId =
          createRes.parsedBody?.instance?.id ||
          createRes.parsedBody?.id ||
          createRes.parsedBody?.instance?.instanceName ||
          createRes.parsedBody?.instanceName
        returnedToken =
          createRes.parsedBody?.hash?.apikey ||
          createRes.parsedBody?.token ||
          createRes.parsedBody?.apikey ||
          null
        externalId = createRes.parsedBody?.instance?.id || createRes.parsedBody?.id || null

        if (returnedId && typeof returnedId === 'string') {
          instanceName = returnedId
        }

        qrcode = extractQrCode(createRes.parsedBody)
        status = 'connecting'

        if (!qrcode) {
          const connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, {
            method: 'GET',
          })
          if (connectRes.ok) {
            qrcode = extractQrCode(connectRes.parsedBody)
            status =
              connectRes.parsedBody?.instance?.state || connectRes.parsedBody?.state || 'connecting'
          }
        }
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

      if (existingInstance) {
        console.log(`[SYNC_STATUS] Updating existing DB record.`)
        const { data } = await supabase
          .from('whatsapp_instances')
          .update(instanceData)
          .eq('id', existingInstance.id)
          .select()
          .single()
        resultInstance = data
      } else {
        console.log(`[SYNC_STATUS] Inserting new DB record.`)
        const { data } = await supabase
          .from('whatsapp_instances')
          .upsert(instanceData, { onConflict: 'instance_name' })
          .select()
          .single()
        resultInstance = data
      }

      return new Response(JSON.stringify({ success: true, instance: resultInstance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'get_status') {
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

        let finalInstance = existingInstance

        if (existingInstance) {
          console.log(`[SYNC_STATUS] Updating DB record with latest status.`)
          const { data } = await supabase
            .from('whatsapp_instances')
            .update(updateData)
            .eq('user_id', user.id)
            .select()
            .single()
          finalInstance = data
        }

        return new Response(
          JSON.stringify({ success: true, instance: finalInstance, phone: phone }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      } else if (stateRes.status === 404) {
        console.log(`[SYNC_STATUS] 404 Not Found from Uazapi on status check. Updating DB.`)
        if (existingInstance) {
          const { data } = await supabase
            .from('whatsapp_instances')
            .update({ status: 'not_found', qrcode: null })
            .eq('user_id', user.id)
            .select()
            .single()
          return new Response(
            JSON.stringify({
              success: true,
              error: 'Instance not found',
              instance: data,
              code: 'INSTANCE_NOT_FOUND',
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }
        return new Response(
          JSON.stringify({
            success: true,
            error: 'Instance not found',
            code: 'INSTANCE_NOT_FOUND',
          }),
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
        console.error('Logout error:', err)
      }

      console.log(`[SYNC_STATUS] Disconnecting/Deleting instance in DB.`)
      const { error } = await supabase.from('whatsapp_instances').delete().eq('user_id', user.id)

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
