import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, instanceId, instanceName, remoteJid, text } = body

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq(instanceId ? 'id' : 'instance_name', instanceId || instanceName)
      .single()

    if (instanceError || !instance) {
      return new Response(
        JSON.stringify({ code: 'INSTANCE_NOT_FOUND', error: 'Instance not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    // Force redirection away from incorrect domains
    let serverUrl = instance.server_url || 'https://api.uazapi.com'
    if (serverUrl.includes('api.goskip.dev')) {
      serverUrl = 'https://gmnaadyvmhzqahdtzbun.supabase.co/functions/v1/whatsapp-uazapi'
    }

    const apikey = instance.instance_token
    if (!apikey) {
      return new Response(
        JSON.stringify({ code: 'UAZAPI_TOKEN_MISSING', error: 'Missing API key' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        },
      )
    }

    const callApi = async (endpoint: string, method: string = 'GET', payload?: any) => {
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json', apikey },
        body: payload ? JSON.stringify(payload) : undefined,
      })

      if (res.status === 401 || res.status === 403) throw new Error('UNAUTHORIZED')
      if (res.status === 429) throw new Error('RATE_LIMIT_REACHED')

      try {
        return await res.json()
      } catch (e) {
        return { success: res.ok, status: res.status }
      }
    }

    if (action === 'get_qr') {
      try {
        const data = await callApi(`/instance/connect/${instance.instance_name}`)
        await supabase
          .from('whatsapp_instances')
          .update({
            qrcode: data?.base64 || null,
            status: 'qrcode',
          })
          .eq('id', instance.id)

        return new Response(
          JSON.stringify({ instance: { ...instance, qrcode: data?.base64, status: 'qrcode' } }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        )
      } catch (e: any) {
        if (e.message === 'UNAUTHORIZED')
          return new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), {
            status: 401,
            headers: corsHeaders,
          })
        if (e.message === 'RATE_LIMIT_REACHED')
          return new Response(JSON.stringify({ code: 'RATE_LIMIT_REACHED' }), {
            status: 429,
            headers: corsHeaders,
          })
        throw e
      }
    }

    if (action === 'get_status') {
      try {
        const data = await callApi(`/instance/connectionState/${instance.instance_name}`)
        const state = data?.instance?.state || 'disconnected'
        await supabase
          .from('whatsapp_instances')
          .update({
            status: state === 'open' ? 'connected' : state,
          })
          .eq('id', instance.id)

        return new Response(
          JSON.stringify({
            state,
            instance: { ...instance, status: state === 'open' ? 'connected' : state },
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        )
      } catch (e: any) {
        if (e.message === 'UNAUTHORIZED')
          return new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), {
            status: 401,
            headers: corsHeaders,
          })
        if (e.message === 'RATE_LIMIT_REACHED')
          return new Response(JSON.stringify({ code: 'RATE_LIMIT_REACHED' }), {
            status: 429,
            headers: corsHeaders,
          })
        throw e
      }
    }

    if (action === 'send_message') {
      try {
        const data = await callApi(`/message/sendText/${instance.instance_name}`, 'POST', {
          number: remoteJid,
          text,
        })
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        })
      } catch (e: any) {
        if (e.message === 'UNAUTHORIZED')
          return new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), {
            status: 401,
            headers: corsHeaders,
          })
        if (e.message === 'RATE_LIMIT_REACHED')
          return new Response(JSON.stringify({ code: 'RATE_LIMIT_REACHED' }), {
            status: 429,
            headers: corsHeaders,
          })
        throw e
      }
    }

    if (action === 'get_conversations') {
      try {
        const chatsResponse = await callApi(`/chat/findChats/${instance.instance_name}`)
        const chats = chatsResponse?.chats || chatsResponse?.data || chatsResponse || []

        if (Array.isArray(chats)) {
          for (const chat of chats) {
            const remoteJid = chat.id || chat.remoteJid
            if (!remoteJid || remoteJid.includes('@g.us') || remoteJid === 'status@broadcast')
              continue

            const pushName = chat.name || chat.pushName || ''
            const profilePic = chat.profilePictureUrl || chat.profilePic || null

            const { data: contactData } = await supabase
              .from('contacts')
              .upsert(
                {
                  instance_id: instance.id,
                  remote_jid: remoteJid,
                  push_name: pushName,
                  profile_picture: profilePic,
                },
                { onConflict: 'instance_id,remote_jid' },
              )
              .select('id')
              .single()

            if (contactData) {
              const unreadCount = chat.unreadCount || 0
              let lastMsg = ''
              if (chat.lastMessage?.message?.conversation) {
                lastMsg = chat.lastMessage.message.conversation
              } else if (chat.lastMessage?.message?.extendedTextMessage?.text) {
                lastMsg = chat.lastMessage.message.extendedTextMessage.text
              } else {
                lastMsg = chat.lastMessage || ''
              }

              let timestamp = new Date().toISOString()
              if (chat.conversationTimestamp) {
                timestamp = new Date(Number(chat.conversationTimestamp) * 1000).toISOString()
              } else if (chat.updatedAt) {
                timestamp = new Date(chat.updatedAt).toISOString()
              }

              await supabase.from('conversations').upsert(
                {
                  instance_id: instance.id,
                  contact_id: contactData.id,
                  last_message: typeof lastMsg === 'string' ? lastMsg.substring(0, 255) : '',
                  unread_count: unreadCount,
                  updated_at: timestamp,
                },
                { onConflict: 'instance_id,contact_id' },
              )
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Conversations sync completed successfully' }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          },
        )
      } catch (e: any) {
        if (e.message === 'UNAUTHORIZED')
          return new Response(JSON.stringify({ code: 'UNAUTHORIZED' }), {
            status: 401,
            headers: corsHeaders,
          })
        if (e.message === 'RATE_LIMIT_REACHED')
          return new Response(JSON.stringify({ code: 'RATE_LIMIT_REACHED' }), {
            status: 429,
            headers: corsHeaders,
          })
        throw e
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Action executed' }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
