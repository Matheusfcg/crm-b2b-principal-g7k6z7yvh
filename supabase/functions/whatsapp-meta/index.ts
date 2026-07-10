import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders as sharedCors } from '../_shared/cors.ts'

const ALLOWED_ORIGINS = [
  'https://crm-b2b-principal-462cb--preview.goskip.app',
  'https://crm-vexa.goskip.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
]

function getCors(req: Request) {
  const origin = req.headers.get('Origin')
  return {
    ...sharedCors,
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*',
  }
}

async function verifySig(rawBody: string, sig: string | null, secret: string): Promise<boolean> {
  if (!sig || !secret || !sig.startsWith('sha256=')) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const computed = 'sha256=' + Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return sig === computed
}

async function ensureInstance(sb: any, userId: string, phoneNumberId: string) {
  const { data } = await sb.from('whatsapp_instances').select('id').eq('user_id', userId).ilike('instance_name', 'meta_%').maybeSingle()
  if (data) return data
  const { data: inst } = await sb.from('whatsapp_instances').insert({
    user_id: userId, instance_name: `meta_${phoneNumberId}`, instance_token: 'meta_cloud_api',
    server_url: 'https://graph.facebook.com', status: 'connected',
  }).select('id').single()
  return inst
}

async function processWebhook(body: any, sb: any) {
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value
      if (!value || value.messaging_product !== 'whatsapp') continue
      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) continue

      const { data: config, error } = await sb
  .from('configuracoes_whatsapp')
  .select('user_id')
  .eq('phone_number_id', phoneNumberId)
  .single();

console.log("PHONE NUMBER ID:", phoneNumberId);
console.log("CONFIG:", config);
console.log("ERROR:", error);

if (!config) {
  console.error("Configuração não encontrada para o Phone Number ID:", phoneNumberId);
  continue;
}

      const instance = await ensureInstance(sb, config.user_id, phoneNumberId)
      if (!instance) continue

      for (const st of value.statuses || []) {
        if (st.id) await sb.from('messages').update({ status: st.status }).eq('message_id', st.id)
      }

      const contacts = value.contacts || []
      for (const msg of value.messages || []) {
        const from = msg.from
        if (!from) continue
        const contactInfo = contacts.find((c: any) => c.wa_id === from)
        const pushName = contactInfo?.profile?.name || from

        const { data: contact } = await sb.from('contacts').upsert(
          { instance_id: instance.id, remote_jid: from, push_name: pushName },
          { onConflict: 'instance_id,remote_jid' },
        ).select('id').single()
        if (!contact) continue

        let content = 'Mensagem'
        if (msg.type === 'text') content = msg.text?.body || ''
        else if (msg.type === 'image') content = msg.image?.caption || 'Imagem'
        else if (msg.type === 'audio') content = 'Audio'
        else if (msg.type === 'document') content = msg.document?.filename || 'Documento'
        else if (msg.type === 'video') content = 'Video'

        const ts = msg.timestamp ? new Date(Number(msg.timestamp) * 1000).toISOString() : new Date().toISOString()

        const { data: conv } = await sb.from('conversations').upsert(
          { instance_id: instance.id, contact_id: contact.id, last_message: content.substring(0, 255), updated_at: ts },
          { onConflict: 'instance_id,contact_id' },
        ).select('id, unread_count').single()
        if (!conv) continue

        await sb.from('messages').upsert(
          { conversation_id: conv.id, message_id: msg.id, from_me: false, content, type: msg.type || 'text', timestamp: ts, status: 'received' },
          { onConflict: 'message_id' },
        )

        await sb.from('conversations').update({ unread_count: (conv.unread_count || 0) + 1 }).eq('id', conv.id)
      }
    }
  }
}

async function handleSend(body: any, sb: any, ch: Record<string, string>) {
  const { instanceId, to, text } = body
  if (!instanceId || !to || !text) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json', ...ch } })
  }

  const { data: instance } = await sb.from('whatsapp_instances').select('user_id').eq('id', instanceId).single()
  if (!instance) return new Response(JSON.stringify({ error: 'Instance not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...ch } })

  const { data: config } = await sb.from('configuracoes_whatsapp').select('phone_number_id, access_token').eq('user_id', instance.user_id).single()
  if (!config) return new Response(JSON.stringify({ error: 'Meta config not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...ch } })

  const res = await fetch(`https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { body: text } }),
  })

  if (!res.ok) {
    const errText = await res.text()
    return new Response(JSON.stringify({ error: `Meta API error (${res.status})`, details: errText }), { status: res.status, headers: { 'Content-Type': 'application/json', ...ch } })
  }

  const data = await res.json()
  const messageId = data.messages?.[0]?.id || `sent_${Date.now()}`

  const { data: contact } = await sb.from('contacts').select('id').eq('instance_id', instanceId).eq('remote_jid', to).maybeSingle()
  if (contact) {
    const { data: conv } = await sb.from('conversations').select('id').eq('instance_id', instanceId).eq('contact_id', contact.id).maybeSingle()
    if (conv) {
      await sb.from('messages').upsert(
        { conversation_id: conv.id, message_id: messageId, from_me: true, content: text, type: 'text', timestamp: new Date().toISOString(), status: 'sent' },
        { onConflict: 'message_id' },
      )
      await sb.from('conversations').update({ last_message: text.substring(0, 255), updated_at: new Date().toISOString() }).eq('id', conv.id)
    }
  }

  return new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json', ...ch } })
}

Deno.serve(async (req: Request) => {
  const ch = getCors(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: ch })

  const sb = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')

  if (req.method === 'GET') {
    const u = new URL(req.url)
    if (u.searchParams.get('hub.mode') === 'subscribe' && u.searchParams.get('hub.verify_token') === (Deno.env.get('META_VERIFY_TOKEN') || '')) {
      return new Response(u.searchParams.get('hub.challenge') || '', { status: 200, headers: { 'Content-Type': 'text/plain', ...ch } })
    }
    return new Response('Forbidden', { status: 403, headers: ch })
  }

  const rawBody = await req.text()
  let body: any = {}
  try { body = JSON.parse(rawBody) } catch {}

  if (body.object === 'whatsapp_business_account' || req.headers.get('X-Hub-Signature-256')) {
    if (!await verifySig(rawBody, req.headers.get('X-Hub-Signature-256'), Deno.env.get('META_APP_SECRET') || '')) {
      return new Response('Unauthorized', { status: 401, headers: ch })
    }
    await processWebhook(body, sb)
    return new Response('OK', { status: 200, headers: ch })
  }

  if (body.action === 'send_message') return await handleSend(body, sb, ch)

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json', ...ch } })
})
