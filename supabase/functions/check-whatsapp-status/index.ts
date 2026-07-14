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

  const result = await zapiFetch(instance, '/status')
  const connected = result.data?.connected ?? false
  const newStatus = connected ? 'connected' : 'disconnected'
  const phoneNumber = result.data?.phoneConnected || instance.phone

  const sb = getSupabaseAdmin()
  await sb
    .from('whatsapp_instances')
    .update({
      status: newStatus,
      phone: phoneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', instance.id)

  return jsonResponse({ status: newStatus, connected })
})
