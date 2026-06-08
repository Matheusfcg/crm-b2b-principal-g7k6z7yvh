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
      Deno.env.get('UAZAPI_URL') ||
      Deno.env.get('UAZAPI_BASE_URL') ||
      Deno.env.get('UAZAPI_SERVER_URL') ||
      'https://free.uazapi.com'
    const uazapiKey = Deno.env.get('UAZAPI_ADMIN_TOKEN') || Deno.env.get('UAZAPI_API_KEY') || ''
    const uazapiUrl = rawUazapiUrl.trim().replace(/\/$/, '')

    const apiHeaders = {
      'Content-Type': 'application/json',
      apikey: uazapiKey,
      admintoken: uazapiKey,
    }

    const { data: existingInstance } = await supabaseAdmin
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    let instanceName =
      existingInstance?.instance_name || `user_${user.id.replace(/[^a-zA-Z0-9]/g, '')}`

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
        endpoint: path,
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
      let returnedId = instanceName

      if (existingInstance && existingInstance.status !== 'not_found') {
        const stateRes = await fetchUazapi(`/instance/status/${instanceName}`, { method: 'GET' })

        if (stateRes.ok) {
          const stateData = stateRes.parsedBody
          if (stateData?.error || stateData?.message === 'Instance not found') {
            status = 'not_found'
          } else {
            status =
              stateData?.instance?.state ||
              stateData?.state ||
              stateData?.stateConnection ||
              stateData?.status ||
              'connecting'

            if (
              status === 'disconnected' ||
              status === 'qrcode' ||
              status === 'connecting' ||
              status === 'close'
            ) {
              const connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, {
                method: 'GET',
              })
              if (connectRes.ok && !connectRes.parsedBody?.error) {
                qrcode = extractQrCode(connectRes.parsedBody)
                status =
                  connectRes.parsedBody?.instance?.state || connectRes.parsedBody?.state || status
              }
            }
          }
        } else if (stateRes.status === 404 || stateRes.parsedBody?.error) {
          status = 'not_found'
        }
      } else {
        status = 'not_found'
      }

      if (status === 'not_found') {
        if (existingInstance?.status === 'not_found' || existingInstance) {
          await fetchUazapi(`/instance/logout/${instanceName}`, { method: 'DELETE' }).catch(
            () => {},
          )
        }

        const createRes = await fetchUazapi('/instance/init', {
          method: 'POST',
          body: JSON.stringify({ instanceName, qrcode: true }),
        })

        const body = createRes.parsedBody
        if (
          !createRes.ok ||
          body?.error ||
          body?.message === 'Instance not found' ||
          body?.status === 'error' ||
          body?.status === 'Fail'
        ) {
          return new Response(
            JSON.stringify({
              error: 'Failed to create instance in Uazapi',
              details: body || createRes.text,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          )
        }

        returnedId =
          body?.instance?.id ||
          body?.id ||
          body?.instance?.instanceName ||
          body?.instanceName ||
          instanceName
        returnedToken = body?.hash?.apikey || body?.token || body?.apikey || returnedToken

        if (!returnedId && !returnedToken) {
          return new Response(
            JSON.stringify({ error: 'Uazapi did not return valid instance data', details: body }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400,
            },
          )
        }

        if (returnedId && typeof returnedId === 'string') {
          instanceName = returnedId
        }

        qrcode = extractQrCode(body)
        status = 'connecting'

        if (!qrcode) {
          const connectRes = await fetchUazapi(`/instance/connect/${instanceName}`, {
            method: 'GET',
          })
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
        last_connection: status === 'open' ? new Date().toISOString() : null,
        instance_token: returnedToken,
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
        if (state === 'open') updateData.qrcode = null
        if (state === 'open') updateData.last_connection = new Date().toISOString()

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

      const { error } = await supabaseAdmin
        .from('whatsapp_instances')
        .delete()
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
