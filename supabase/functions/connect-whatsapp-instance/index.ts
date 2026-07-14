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

  const { user, error } = await getAuthUser(req)
  if (!user) return jsonResponse({ error }, 401)

  const instance = await getInstanceByUserId(user.id)
  if (!instance) return jsonResponse({ error: 'Instância Z-API não configurada' }, 404)

  // Initiate connection on Z-API
  await zapiFetch(instance, '/connect', { method: 'POST' })

  // Retrieve QR code image
  const qrResult = await zapiFetch(instance, '/qr-code/image')
  let qrValue: string | null = qrResult.data?.value || qrResult.data?.qrcode || null

  if (typeof qrResult.data === 'string' && qrResult.data.length > 100) {
    qrValue = qrResult.data
  }

  if (qrValue && !qrValue.startsWith('data:')) {
    qrValue = `data:image/png;base64,${qrValue}`
  }

  // Update instance status to qrcode_pending
  const sb = getSupabaseAdmin()
  await sb
    .from('whatsapp_instances')
    .update({ status: 'qrcode_pending', updated_at: new Date().toISOString() })
    .eq('id', instance.id)

  return jsonResponse({ qrcode: qrValue })
})
