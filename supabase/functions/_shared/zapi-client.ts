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

export function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  return createClient(url, serviceKey)
}

export async function getAuthUser(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { user: null, error: 'Sem header de autorização' }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await userClient.auth.getUser()
  if (error || !data.user) return { user: null, error: 'Não autorizado' }
  return { user: data.user, error: null }
}

export interface WhatsappInstanceRow {
  id: string
  user_id: string | null
  instance_id: string | null
  instance_token: string | null
  token: string | null
  client_token: string | null
  status: string | null
  phone: string | null
}

export async function getInstanceByUserId(userId: string): Promise<WhatsappInstanceRow | null> {
  const sb = getSupabaseAdmin()
  const { data } = await sb
    .from('whatsapp_instances')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  return data as WhatsappInstanceRow | null
}

export async function getInstanceByInstanceId(
  instanceId: string,
): Promise<WhatsappInstanceRow | null> {
  const sb = getSupabaseAdmin()
  const { data } = await sb
    .from('whatsapp_instances')
    .select('*')
    .eq('instance_id', instanceId)
    .maybeSingle()
  return data as WhatsappInstanceRow | null
}

export async function zapiFetch(
  instance: WhatsappInstanceRow,
  path: string,
  init: RequestInit = {},
) {
  const token = instance.instance_token || instance.token || ''
  const url = `https://api.z-api.io/instances/${instance.instance_id}/token/${token}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }

  if (instance.client_token && instance.client_token.trim() !== '') {
    headers['Client-Token'] = instance.client_token
  }

  const response = await fetch(url, { ...init, headers })
  const text = await response.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  return { status: response.status, data, ok: response.ok }
}
