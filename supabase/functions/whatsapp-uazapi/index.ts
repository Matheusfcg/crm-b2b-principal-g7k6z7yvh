import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type, instance',
}

const sanitizeInstanceName = (name: string) => {
  if (!name) return name
  let cleanName = name.split('?')[0].split('&')[0].trim()
  const parts = cleanName.split('_')
  if (parts.length > 2 && /^\d+$/.test(parts[parts.length - 1])) {
    parts.pop()
    cleanName = parts.join('_')
  }
  return cleanName
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
      Deno.env.get('UAZAPI_ADMIN_TOKEN') ||
      Deno.env.get('UAZAPI_TOKEN') ||
      Deno.env.get('UAZAPI_API_KEY') ||
      ''
    const uazapiUrl = rawUazapiUrl.trim().replace(/\/$/, '')

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

    if (
      instanceName &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
        instanceName,
      )
    ) {
      instanceName = null
    }

    if (!instanceName && action !== 'check_or_create') {
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

    const fetchUazapi = async (path: string, options: RequestInit = {}) => {
      const url = `${uazapiUrl}${path}`
      const payload = options.body ? JSON.parse(options.body as string) : null

      const res = await fetch(url, options)
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

      if (!res.ok) {
        console.error(
          `[ERROR] action: uazapi_fetch, instance: ${instanceName}, status: ${status}, path: ${path}, details: ${text}`,
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
        parsedBody?.instance?.qrcode ||
        parsedBody?.instance?.qr ||
        parsedBody?.data?.qrcode ||
        parsedBody?.data?.qr ||
        null
      let qrcode = rawQrcode
      if (qrcode && typeof qrcode === 'string') {
        if (qrcode.length <= 3 || qrcode === '404') {
          return null
        }
        if (!qrcode.startsWith('data:image') && !qrcode.startsWith('http')) {
          qrcode = `data:image/png;base64,${qrcode}`
        }
      }
      return qrcode
    }

    const getApiHeaders = (token: string, instance?: string) => {
      const headers: any = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${uazapiKey}`,
        apikey: token,
        admintoken: uazapiKey,
      }
      if (instance) {
        headers['instance'] = instance
      }
      return headers
    }

    const connectInstance = async (targetInstanceName: string, token: string) => {
      const cleanInstanceName = sanitizeInstanceName(targetInstanceName)
      const connectPath = `/instance/connect/${cleanInstanceName}`
      const connectHeaders = getApiHeaders(token, cleanInstanceName)

      let attempt = 0
      const maxAttempts = 3
      let connectRes: any = null

      while (attempt < maxAttempts) {
        attempt++
        connectRes = await fetchUazapi(connectPath, {
          method: 'POST',
          headers: connectHeaders,
          body: JSON.stringify({ phone: '' }),
        })

        if (connectRes.status !== 404) {
          break
        }

        if (attempt < maxAttempts) {
          console.log(
            `[CONNECT] Attempt ${attempt} failed with 404 for instance ${cleanInstanceName}, retrying in 2s...`,
          )
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }

      return connectRes
    }

    if (action === 'check_or_create') {
      let qrcode = null
      let status = 'connecting'
      let returnedToken = existingInstance?.instance_token
      let returnedId = existingInstance?.instance_external_id || instanceName

      let needsInit = true

      if (existingInstance && instanceName) {
        const stateRes = await fetchUazapi(`/instance/status/${instanceName}`, {
          method: 'GET',
          headers: getApiHeaders(returnedToken || uazapiKey, instanceName),
        })

        if (
          stateRes.ok &&
          stateRes.parsedBody &&
          !stateRes.parsedBody.error &&
          stateRes.parsedBody.message !== 'Instance not found'
        ) {
          needsInit = false
        }
      }

      if (needsInit) {
        instanceName = `user_${user.id.replace(/-/g, '')}_${Date.now()}`

        let createRes = await fetchUazapi('/instance/init', {
          method: 'POST',
          headers: getApiHeaders(uazapiKey),
          body: JSON.stringify({
            instanceName: instanceName,
            Name: instanceName,
            name: instanceName,
            qrcode: true,
          }),
        })

        let resBody = createRes.parsedBody

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
        returnedToken =
          resBody?.hash?.apikey ||
          resBody?.token ||
          resBody?.apikey ||
          resBody?.instance?.token ||
          returnedToken

        if (uazapiInstanceName && typeof uazapiInstanceName === 'string') {
          instanceName = uazapiInstanceName
        }

        console.log(`[INIT] Triggering connection POST for instance: ${instanceName}`)

        let connectRes = await connectInstance(instanceName, returnedToken || uazapiKey)

        qrcode = extractQrCode(connectRes?.parsedBody) || extractQrCode(resBody)
        status =
          connectRes?.parsedBody?.instance?.state || connectRes?.parsedBody?.state || 'connecting'
      } else {
        let connectRes = await connectInstance(instanceName!, returnedToken || uazapiKey)
        if (connectRes?.ok && !connectRes?.parsedBody?.error) {
          qrcode = extractQrCode(connectRes.parsedBody)
          status =
            connectRes.parsedBody?.instance?.state || connectRes.parsedBody?.state || 'connecting'
        } else {
          status = existingInstance?.status || 'disconnected'
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
        instance_name: resultInstance.instance_name,
        instance_token: resultInstance.instance_token,
      }

      return new Response(JSON.stringify({ success: true, instance: safeInstance, uazapiUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else if (action === 'get_status') {
      const returnedToken = existingInstance?.instance_token

      const stateRes = await fetchUazapi(`/instance/status/${instanceName}`, {
        method: 'GET',
        headers: getApiHeaders(returnedToken || uazapiKey, instanceName),
      })

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
          let statusQr =
            extractQrCode({ base64: stateData?.instance?.qrcode }) || extractQrCode(stateData)

          if (!statusQr) {
            let connectRes = await connectInstance(instanceName!, returnedToken || uazapiKey)
            if (connectRes?.ok && !connectRes?.parsedBody?.error) {
              statusQr =
                extractQrCode({ base64: connectRes.parsedBody?.instance?.qrcode }) ||
                extractQrCode(connectRes.parsedBody)
              if (connectRes.parsedBody?.instance?.state) {
                updateData.status = connectRes.parsedBody.instance.state
              } else if (connectRes.parsedBody?.state) {
                updateData.status = connectRes.parsedBody.state
              }
            }
          }

          if (statusQr) {
            updateData.qrcode = statusQr
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
              instance_name: finalInstance.instance_name,
              instance_token: finalInstance.instance_token,
            }
          : null

        return new Response(
          JSON.stringify({ success: true, instance: safeInstance, phone: phone, uazapiUrl }),
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
            instance_name: data.instance_name,
            instance_token: data.instance_token,
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
        const returnedToken = existingInstance?.instance_token
        const cleanName = sanitizeInstanceName(instanceName!)
        await fetchUazapi(`/instance/logout/${cleanName}`, {
          method: 'DELETE',
          headers: getApiHeaders(returnedToken || uazapiKey, cleanName),
        })
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
