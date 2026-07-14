import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import {
  corsHeaders,
  jsonResponse,
  getAuthUser,
  getInstanceByUserId,
  getSupabaseAdmin,
  zapiFetch,
} from '../_shared/zapi-client.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { user, error: authError } = await getAuthUser(req)
  if (!user) return jsonResponse({ success: false, error: authError || 'Não autorizado' }, 401)

  const instance = await getInstanceByUserId(user.id)
  if (!instance) {
    return jsonResponse(
      {
        success: false,
        error:
          'Instância Z-API não configurada. Configure sua instância nas configurações do WhatsApp.',
      },
      404,
    )
  }

  if (instance.status !== 'connected') {
    return jsonResponse(
      {
        success: false,
        error:
          'Instância não está conectada. Conecte seu WhatsApp nas configurações antes de enviar mensagens.',
      },
      400,
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ success: false, error: 'Corpo da requisição inválido' }, 400)
  }

  const { phone, message } = body
  if (!phone || !message) {
    return jsonResponse(
      { success: false, error: 'Parâmetros "phone" e "message" são obrigatórios' },
      400,
    )
  }

  const result = await zapiFetch(instance, '/send-text', {
    method: 'POST',
    body: JSON.stringify({ phone, message }),
  })

  const sb = getSupabaseAdmin()

  if (!result.ok) {
    let errorMsg = `Erro HTTP ${result.status} ao enviar mensagem via Z-API`
    if (typeof result.data === 'string' && result.data.length > 0) {
      errorMsg = result.data
    } else if (result.data?.error) {
      errorMsg =
        typeof result.data.error === 'string' ? result.data.error : String(result.data.error)
    } else if (result.data?.message) {
      errorMsg = result.data.message
    }

    await sb.from('whatsapp_logs').insert({
      user_id: user.id,
      instance_id: instance.instance_id,
      endpoint: '/send-text',
      payload: { phone, message },
      response: result.data,
      status: result.status,
    })

    return jsonResponse({ success: false, error: errorMsg }, 500)
  }

  if (result.data?.messageId) {
    const { error: insertError } = await sb.from('whatsapp_messages').insert({
      user_id: user.id,
      instance_id: instance.instance_id,
      message_id: result.data.messageId,
      chat_id: phone,
      phone,
      direction: 'outbound',
      type: 'text',
      text: message,
      status: 'sent',
    })

    if (insertError) {
      await sb.from('whatsapp_logs').insert({
        user_id: user.id,
        instance_id: instance.instance_id,
        endpoint: '/send-text',
        payload: { phone, message },
        response: {
          error: 'Failed to persist message',
          details: insertError.message,
          zapiResponse: result.data,
        },
        status: 500,
      })
    }
  }

  return jsonResponse({ success: true, data: result.data })
})
