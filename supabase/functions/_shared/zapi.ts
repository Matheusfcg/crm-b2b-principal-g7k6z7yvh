import { createClient } from 'jsr:@supabase/supabase-js@2'

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

export async function getAuthContext(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const authHeader = req.headers.get('Authorization')
  if (!authHeader)
    return { user: null, sb: null, instance: null, error: 'Sem header de autorização' }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) return { user: null, sb: null, instance: null, error: 'Não autorizado' }

  const sb = createClient(supabaseUrl, serviceKey)
  const { data: instance } = await sb
    .from('whatsapp_instances')
    .select('*')
    .eq('user_id', data.user.id)
    .eq('provider', 'z-api')
    .maybeSingle()

  return { user: data.user, sb, instance, error: null }
}

export async function callZapi(
  instanceId: string,
  instanceToken: string,
  clientToken: string,
  endpoint: string,
  method = 'GET',
  body?: any,
) {
  const url = `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}${endpoint}`
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Client-Token': clientToken },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { status: res.status, data, ok: res.ok }
}

export async function logApiCall(
  sb: any,
  userId: string,
  instanceId: string | null,
  endpoint: string,
  payload: any,
  response: any,
  status: number,
) {
  try {
    await sb.from('whatsapp_logs').insert({
      user_id: userId,
      instance_id: instanceId,
      instance_name: instanceId,
      endpoint,
      payload: payload || null,
      response: response || null,
      status,
    })
  } catch (err) {
    console.error('Log error:', err)
  }
}
