import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

const APP_ID = '2113443072550231'
const GRAPH_VERSION = 'v23.0'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const appSecret = Deno.env.get('META_APP_SECRET') || ''

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const { code } = await req.json()
    if (!code) {
      return new Response(JSON.stringify({ error: 'Código de autorização não fornecido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const tokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${APP_ID}&client_secret=${appSecret}&code=${code}`,
      { method: 'POST' },
    )

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}))
      return new Response(
        JSON.stringify({
          error: `Falha ao trocar código por token: ${errData?.error?.message || tokenRes.statusText}`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      )
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Token de acesso não recebido.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const bizRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/me/businesses`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const bizData = await bizRes.json()
    const businesses = bizData.data || []

    if (businesses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma conta do WhatsApp Business encontrada.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      )
    }

    let businessId: string | null = null
    let wabaId: string | null = null
    let phoneNumberId: string | null = null
    let displayPhoneNumber: string | null = null
    let verifiedName: string | null = null

    for (const biz of businesses) {
      const wabaRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${biz.id}/owned_whatsapp_business_accounts`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )
      const wabaData = await wabaRes.json()
      const wabaAccounts = wabaData.data || []

      if (wabaAccounts.length > 0) {
        businessId = biz.id
        wabaId = wabaAccounts[0].id

        const phoneRes = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/phone_numbers`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        const phoneData = await phoneRes.json()
        const phones = phoneData.data || []

        if (phones.length > 0) {
          phoneNumberId = phones[0].id
          displayPhoneNumber = phones[0].display_phone_number || null
          verifiedName = phones[0].verified_name || null
          break
        }
      }
    }

    if (!wabaId || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma conta do WhatsApp Business encontrada.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
      )
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: existingAccount } = await serviceClient
      .from('whatsapp_accounts')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingAccount) {
      await serviceClient
        .from('whatsapp_accounts')
        .update({
          business_id: businessId,
          waba_id: wabaId,
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhoneNumber,
          access_token: accessToken,
          token_type: tokenData.token_type || 'Bearer',
        })
        .eq('id', existingAccount.id)
    } else {
      await serviceClient.from('whatsapp_accounts').insert({
        user_id: user.id,
        business_id: businessId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
        access_token: accessToken,
        token_type: tokenData.token_type || 'Bearer',
      })
    }

    const { data: existingConfig } = await serviceClient
      .from('configuracoes_whatsapp')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingConfig) {
      await serviceClient
        .from('configuracoes_whatsapp')
        .update({
          phone_number_id: phoneNumberId,
          waba_id: wabaId,
          access_token: accessToken,
        })
        .eq('id', existingConfig.id)
    } else {
      await serviceClient.from('configuracoes_whatsapp').insert({
        user_id: user.id,
        phone_number_id: phoneNumberId,
        waba_id: wabaId,
        access_token: accessToken,
      })
    }

    const instanceName = `meta_${phoneNumberId}`
    const { data: existingInstance } = await serviceClient
      .from('whatsapp_instances')
      .select('id')
      .eq('user_id', user.id)
      .ilike('instance_name', 'meta_%')
      .maybeSingle()

    if (existingInstance) {
      await serviceClient
        .from('whatsapp_instances')
        .update({
          instance_name: instanceName,
          status: 'connected',
          server_url: 'https://graph.facebook.com',
          phone: displayPhoneNumber,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingInstance.id)
    } else {
      await serviceClient.from('whatsapp_instances').insert({
        user_id: user.id,
        instance_name: instanceName,
        instance_token: 'meta_cloud_api',
        server_url: 'https://graph.facebook.com',
        status: 'connected',
        phone: displayPhoneNumber,
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        phone_number: displayPhoneNumber,
        verified_name: verifiedName,
      }),
      { headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } },
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Erro interno do servidor.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
