import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse, getAuthContext, callZapi, logApiCall } from '../_shared/zapi.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { user, sb, instance, error } = await getAuthContext(req)
  if (!user) return jsonResponse({ error }, 401)
  if (!instance) return jsonResponse({ error: 'Instância Z-API não configurada' }, 404)

  const result = await callZapi(
    instance.instance_id,
    instance.instance_token,
    instance.client_token,
    '/qr-code',
  )
  await logApiCall(sb, user.id, instance.instance_id, '/qr-code', null, result.data, result.status)

  let qrValue = result.data?.value || result.data?.qrcode || null
  if (qrValue && !qrValue.startsWith('data:')) {
    qrValue = `data:image/png;base64,${qrValue}`
  }

  return jsonResponse({ qrCode: qrValue, data: result.data })
})
