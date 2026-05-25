import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Basic validation to ensure requests are authorized if a secret is configured in Supabase Secrets
    const expectedKey = Deno.env.get('WHATSAPP_WEBHOOK_SECRET')
    if (expectedKey) {
      const authHeader = req.headers.get('authorization')
      const apiKeyHeader = req.headers.get('x-api-key')
      if (authHeader !== `Bearer ${expectedKey}` && apiKeyHeader !== expectedKey) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders })
      }
    }

    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    // Parse the payload depending on the external provider (e.g., Evolution API, Baileys, etc.)
    const payload = await req.json()

    // Adapt extraction to handle common WhatsApp webhook formats
    const remoteJid =
      payload?.data?.key?.remoteJid ||
      payload?.data?.remoteJid ||
      payload?.remoteJid ||
      payload?.from
    const messageText =
      payload?.data?.message?.conversation ||
      payload?.data?.message ||
      payload?.message ||
      payload?.text?.body
    const pushName =
      payload?.data?.pushName || payload?.pushName || payload?.senderName || 'Contato WhatsApp'

    // Ignore status messages or missing data silently to not block the external API queue
    if (!remoteJid || !messageText || typeof messageText !== 'string') {
      return new Response(JSON.stringify({ status: 'ignored' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase client with Service Role Key to bypass RLS during webhook processing
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // 1. Find or Create Lead mapping via whatsapp_external_id
    let { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('whatsapp_external_id', remoteJid)
      .single()

    let activeUserId = userId

    if (!lead) {
      // Fallback: If no userId was provided in the webhook URL, assign to the first admin
      if (!activeUserId) {
        const { data: admin } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)
          .single()
        activeUserId = admin?.id
      }

      if (!activeUserId) {
        return new Response('Error: No active user to assign the lead', {
          status: 400,
          headers: corsHeaders,
        })
      }

      const telefone = remoteJid.replace(/[^0-9]/g, '')
      const emailMock = `${telefone}@whatsapp.local`

      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          whatsapp_external_id: remoteJid,
          contato: pushName,
          empresa: 'Contato via WhatsApp',
          email: emailMock,
          telefone: telefone,
          segmento: 'Não Informado',
          tamanho: 'Não Informado',
          origem: 'WhatsApp',
          status: 'Novo',
          created_by: activeUserId,
        })
        .select()
        .single()

      if (createError) throw createError
      lead = newLead
    } else {
      activeUserId = activeUserId || lead.created_by
    }

    // 2. Log interaction
    const { error: intError } = await supabase.from('interactions').insert({
      lead_id: lead.id,
      user_id: activeUserId,
      tipo: 'WhatsApp',
      descricao: messageText,
    })

    if (intError) throw intError

    // 3. Automated Proposal Creation based on message intent/keywords
    const keywords = [
      'proposta',
      'fechar negócio',
      'orçamento',
      'comprar',
      'preço',
      'valor',
      'cotação',
    ]
    const textLower = messageText.toLowerCase()
    const wantsProposal = keywords.some((kw) => textLower.includes(kw))

    if (wantsProposal) {
      await supabase.from('proposals').insert({
        lead_id: lead.id,
        user_id: activeUserId,
        titulo: `Proposta via WhatsApp - ${pushName}`,
        valor: 0,
        status: 'Aberto',
        descricao: `Gerado automaticamente a partir da mensagem: "${messageText}"`,
      })
    }

    return new Response(JSON.stringify({ success: true, leadId: lead.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
