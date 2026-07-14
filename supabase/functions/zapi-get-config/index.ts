import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders, jsonResponse, getAuthContext } from '../_shared/zapi.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { user, instance, error } = await getAuthContext(req)
  if (!user) return jsonResponse({ error }, 401)

  if (!instance) {
    return jsonResponse({ instance: null })
  }

  return jsonResponse({
    instance: {
      id: instance.id,
      user_id: instance.user_id,
      provider: instance.provider || 'z-api',
      instance_id: instance.instance_id || '',
      status: instance.status || 'disconnected',
      phone: instance.phone || null,
      created_at: instance.created_at,
      updated_at: instance.updated_at,
      has_instance_token: !!instance.instance_token,
      has_client_token: !!instance.client_token,
      has_webhook_token: !!instance.webhook_token,
    },
  })
})
