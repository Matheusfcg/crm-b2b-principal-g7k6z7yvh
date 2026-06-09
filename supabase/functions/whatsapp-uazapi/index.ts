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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const supabaseAuthClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await supabaseAuthClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? supabaseKey,
    )

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
      Deno.env.get('UAZAPI_SERVER_URL') ||
      Deno.env.get('UAZAPI_URL') ||
      Deno.env.get('UAZAPI_BASE_URL') ||
      'https://apiwhatsvexaview.uazapi.com'
    const uazapiKey =
      Deno.env.get('UAZAPI_TOKEN') ||
      Deno.env.get('UAZAPI_ADMIN_TOKEN') ||
      Deno.env.get('UAZAPI_API_KEY') ||
      ''
    const uazapiUrl = rawUazapiUrl.trim().replace(/\/$/, '')

    const apiHeaders = {
      'Content-Type': 'application/json',
      apikey: uazapiKey,
      admintoken: uazapiKey,
    }

    const providedId = body.instanceId || body.instanceName
    const isProvidedIdUuid =
      providedId &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        providedId,
      )

    let query = supabaseAdmin.from('whatsapp_instances').select('*').eq('user_id', user.id)

    if (isProvidedIdUuid) {
      query = query.eq('id', providedId)
    }

    const { data: existingInstance } = await query.maybeSingle()

    let instanceName = existingInstance?.instance_name

    // Prevent using a 36-char Supabase UUID as the Uazapi instance name
    if (
      instanceName &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        instanceName,
      )
    ) {
      instanceName = null
    }

    if (!instanceName) {
      if (action === 'check_or_create') {
        instanceName = `user_${user.id.replace(/-/g, '')}`
      } else {
        return new Response(
          JSON.stringify({
            success: true,
            error: 'Instance not found in database',
            code: 'INSTANCE_NOT_FOUND',
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          },
        )
      }
    }

    const fetchUazapi = async (path: string, options: RequestInit = {}) => {
      const url = `${uazapiUrl}${path}`
      const payload = options.body ? JSON.parse(options.body as string) : null

      const res = await fetch(url, { ...options, headers: apiHeaders })
      const status = res.status
      const text = await res.text()

      let parsedBody: any = text
      try {
        if (text) parsedBody = JSON.parse(text)
      } catch (e) {}

      await supabaseAdmin.from('whatsapp_logs').insert({
        instance_name: instanceName,
        endpoint: url,
        payload: payload,
        response: { status, body: parsedBody },
        user_id: user.id,
      })

      return { ok: res.ok, status, text, parsedBody }
    }

    const extractQrCode = (parsedBody: any) => {
      let rawQrcode =
        parsedBody?.base64 ||
        parsedBody?.qrcode?.base64 ||
        parsedBody?.qrcode ||
        parsedBody?.qr ||
        parsedBody?.code ||
        parsedBody?.instance?.qrcode ||
        parsedBody?.instance?.qr ||
        parsedBody?.data?.qrcode ||
        parsedBody?.data?.qr ||
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
      let returnedToken = existingInstance?.instance_token
      let returnedId = existingInstance?.instance_external_id || instanceName

      const stateRes = await fetchUazapi(`/instance/status/${instanceName}`, { method: 'GET' })
      let instanceExistsInUazapi = false
      let uazapiState = 'not_found'

      if (stateRes.ok) {
        const stateData = stateRes.parsedBody
        if (!stateData?.error && stateData?.message !== 'Instance not found') {
          instanceExistsInUazapi = true
          uazapiState =
            stateData?.instance?.state ||
            stateData?.state ||
            stateData?.stateConnection ||
            stateData?.status ||
            'connecting'
        }
      }

      if (instanceExistsInUazapi) {
        status = uazapiState
        if (
          status === 'disconnected' ||
          status === 'qrcode' ||
          status === 'connecting' ||
          status === 'close'
        ) {
          let connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, { method: 'GET' })
          if (!connectRes.ok || connectRes.status === 404) {
            connectRes = await fetchUazapi(`/instance/qr/${instanceName}`, { method: 'GET' })
          }
          if (connectRes.ok && !connectRes.parsedBody?.error) {
            qrcode = extractQrCode(connectRes.parsedBody)
            status =
              connectRes.parsedBody?.instance?.state || connectRes.parsedBody?.state || status
          }
        }
      } else {
        if (existingInstance?.status === 'not_found' || existingInstance) {
          await fetchUazapi(`/instance/logout/${instanceName}`, { method: 'DELETE' }).catch(
            () => {},
          )
        }

        const createRes = await fetchUazapi('/instance/init', {
          method: 'POST',
          body: JSON.stringify({
            instanceName: instanceName,
            Name: instanceName,
            name: instanceName,
            qrcode: true,
          }),
        })

        const resBody = createRes.parsedBody

        if (
          !createRes.ok ||
          !resBody ||
          resBody?.error ||
          resBody?.message === 'Instance not found' ||
          resBody?.status === 'error' ||
          resBody?.status === 'Fail'
        ) {
          const errorMsg =
            resBody?.message || resBody?.error || 'Failed to create instance in Uazapi'
          let customErrorMsg = `Uazapi: ${errorMsg}`

          if (
            typeof errorMsg === 'string' &&
            (errorMsg.includes('Maximum number of instances reached') ||
              errorMsg.includes('limit') ||
              errorMsg.includes('Limit'))
          ) {
            customErrorMsg = 'LIMIT_REACHED'
          } else if (typeof resBody?.message === 'string' && resBody.message.includes('reached')) {
            customErrorMsg = 'LIMIT_REACHED'
          }

          return new Response(
            JSON.stringify({ error: customErrorMsg, details: resBody || createRes.text }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }

        const uazapiInstanceName =
          resBody?.instance?.instanceName ||
          resBody?.instance?.name ||
          resBody?.instanceName ||
          resBody?.name ||
          instanceName
        returnedId =
          resBody?.instance?.instanceId ||
          resBody?.instance?.id ||
          resBody?.id ||
          uazapiInstanceName
        returnedToken = resBody?.hash?.apikey || resBody?.token || resBody?.apikey || returnedToken

        if (!returnedId) {
          return new Response(
            JSON.stringify({
              error: 'Uazapi did not return a valid instance identifier',
              details: resBody,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            },
          )
        }

        if (uazapiInstanceName && typeof uazapiInstanceName === 'string') {
          instanceName = uazapiInstanceName
        }

        qrcode = extractQrCode(resBody)
        status = 'connecting'

        if (!qrcode) {
          let connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, { method: 'GET' })
          if (!connectRes.ok || connectRes.status === 404) {
            connectRes = await fetchUazapi(`/instance/qr/${instanceName}`, { method: 'GET' })
          }
          if (connectRes.ok && !connectRes.parsedBody?.error) {
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
        last_connection:
          status === 'open' || status === 'connected' ? new Date().toISOString() : null,
        instance_token: returnedToken,
        instance_external_id: returnedId,
        updated_at: new Date().toISOString(),
      }

      let resultInstance

      if (existingInstance) {
        const { data } = await supabaseAdmin
          .from('whatsapp_instances')
          .update(instanceData)
          .eq('id', existingInstance.id)
          .select()
          .single()
        resultInstance = data
      } else {
        const { data } = await supabaseAdmin
          .from('whatsapp_instances')
          .upsert(instanceData, { onConflict: 'user_id' })
          .select()
          .single()
        resultInstance = data
      }

      const safeInstance = {
        id: resultInstance.id,
        user_id: resultInstance.user_id,
        status: resultInstance.status,
        qrcode: resultInstance.qrcode,
        last_connection: resultInstance.last_connection,
        phone: resultInstance.phone,
      }

      return new Response(JSON.stringify({ success: true, instance: safeInstance }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'get_status') {
      const stateRes = await fetchUazapi(`/instance/status/${instanceName}`, { method: 'GET' })
      if (stateRes.ok && !stateRes.parsedBody?.error) {
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
          updated_at: new Date().toISOString(),
        }
        if (phone) updateData.phone = phone
        if (state === 'open' || state === 'connected') {
          updateData.qrcode = null
          updateData.last_connection = new Date().toISOString()
        } else if (state === 'connecting' || state === 'qrcode' || state === 'disconnected') {
          let connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, { method: 'GET' })
          if (!connectRes.ok || connectRes.status === 404) {
            connectRes = await fetchUazapi(`/instance/qr/${instanceName}`, { method: 'GET' })
          }
          if (connectRes.ok && !connectRes.parsedBody?.error) {
            const qr = extractQrCode(connectRes.parsedBody)
            if (qr) updateData.qrcode = qr
            if (connectRes.parsedBody?.instance?.state) {
              updateData.status = connectRes.parsedBody.instance.state
            } else if (connectRes.parsedBody?.state) {
              updateData.status = connectRes.parsedBody.state
            }
          }
        }

        let finalInstance = existingInstance

        if (existingInstance) {
          const { data } = await supabaseAdmin
            .from('whatsapp_instances')
            .update(updateData)
            .eq('id', existingInstance.id)
            .select()
            .single()
          finalInstance = data
        }

        const safeInstance = finalInstance
          ? {
              id: finalInstance.id,
              user_id: finalInstance.user_id,
              status: finalInstance.status,
              qrcode: finalInstance.qrcode,
              last_connection: finalInstance.last_connection,
              phone: finalInstance.phone,
            }
          : null

        return new Response(
          JSON.stringify({ success: true, instance: safeInstance, phone: phone }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      } else if (
        stateRes.status === 404 ||
        stateRes.parsedBody?.error ||
        stateRes.parsedBody?.message === 'Instance not found'
      ) {
        if (existingInstance) {
          const { data } = await supabaseAdmin
            .from('whatsapp_instances')
            .update({ status: 'not_found', qrcode: null, updated_at: new Date().toISOString() })
            .eq('id', existingInstance.id)
            .select()
            .single()

          const safeInstance = {
            id: data.id,
            user_id: data.user_id,
            status: data.status,
            qrcode: data.qrcode,
            last_connection: data.last_connection,
            phone: data.phone,
          }
          return new Response(
            JSON.stringify({
              success: true,
              error: stateRes.parsedBody?.error || 'Instance not found',
              instance: safeInstance,
              code: 'INSTANCE_NOT_FOUND',
              details: stateRes.parsedBody,
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

      if (existingInstance) {
        const { error } = await supabaseAdmin
          .from('whatsapp_instances')
          .delete()
          .eq('id', existingInstance.id)
        if (error) throw error
      }

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
