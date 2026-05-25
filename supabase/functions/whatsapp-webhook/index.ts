import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const payload = await req.json()
    const event = payload?.event
    const instanceName = payload?.instance

    if (!instanceName) {
      return new Response('No instance', { status: 400 })
    }

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('instance_name', instanceName)
      .single()

    if (!instance) {
      return new Response('Instance not found in DB', { status: 200 })
    }

    if (event === 'connection.update') {
      const state = payload?.data?.state
      if (state) {
        await supabase
          .from('whatsapp_instances')
          .update({
            status: state,
            last_connection: state === 'open' ? new Date().toISOString() : instance.last_connection,
          })
          .eq('id', instance.id)
      }
    } else if (event === 'qrcode.updated') {
      const qrcode = payload?.data?.qrcode?.base64 || payload?.data?.qrcode
      if (qrcode) {
        await supabase
          .from('whatsapp_instances')
          .update({
            qrcode:
              typeof qrcode === 'string' && !qrcode.startsWith('data:image')
                ? `data:image/png;base64,${qrcode}`
                : qrcode,
            status: 'connecting',
          })
          .eq('id', instance.id)
      }
    } else if (event === 'messages.upsert') {
      const msgs = payload?.data?.messages || [payload?.data]

      for (const msg of msgs) {
        const remoteJid = msg?.key?.remoteJid || msg?.remoteJid
        const fromMe = msg?.key?.fromMe || msg?.fromMe || false

        const messageText =
          msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || msg?.text?.body
        const pushName = msg?.pushName || 'Contato WhatsApp'

        if (!remoteJid || !messageText) continue

        if (remoteJid.includes('@g.us') || remoteJid === 'status@broadcast') continue

        let { data: contact } = await supabase
          .from('contacts')
          .select('*')
          .eq('instance_id', instance.id)
          .eq('remote_jid', remoteJid)
          .single()
        if (!contact) {
          const { data: newContact } = await supabase
            .from('contacts')
            .insert({
              instance_id: instance.id,
              remote_jid: remoteJid,
              push_name: pushName,
            })
            .select()
            .single()
          contact = newContact
        }

        let { data: conversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('instance_id', instance.id)
          .eq('contact_id', contact?.id)
          .single()
        if (!conversation && contact) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              instance_id: instance.id,
              contact_id: contact.id,
              last_message: messageText,
            })
            .select()
            .single()
          conversation = newConv
        } else if (conversation) {
          await supabase
            .from('conversations')
            .update({
              last_message: messageText,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conversation.id)
        }

        if (conversation) {
          await supabase.from('messages').insert({
            conversation_id: conversation.id,
            message_id: msg?.key?.id || msg?.messageId || crypto.randomUUID(),
            from_me: fromMe,
            content: messageText,
            type: 'text',
          })
        }

        if (fromMe) continue

        let { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('whatsapp_external_id', remoteJid)
          .single()

        const activeUserId = instance.user_id

        if (!lead) {
          const telefone = remoteJid.replace(/[^0-9]/g, '')
          const emailMock = `${telefone}@whatsapp.local`

          const { data: newLead, error: leadError } = await supabase
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

          if (!leadError) {
            lead = newLead
          }
        }

        if (lead) {
          await supabase.from('interactions').insert({
            lead_id: lead.id,
            user_id: activeUserId,
            tipo: 'WhatsApp',
            descricao: messageText,
          })

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
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
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
