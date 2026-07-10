export async function processProposalAutomation(
  sb: any,
  phoneNumber: string,
  messageContent: string,
  userId: string
): Promise<void> {
  if (!phoneNumber || !userId) return

  try {
    const { data: lead } = await sb
      .from('leads')
      .select('id, status')
      .eq('whatsapp_external_id', phoneNumber)
      .maybeSingle()

    if (!lead) return

    const lowerContent = (messageContent || '').toLowerCase().trim()

    if (lowerContent === 'proposta' || lowerContent.includes('enviar proposta')) {
      const { data: proposals } = await sb
        .from('proposals')
        .select('id, titulo, valor, status')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (proposals && proposals.length > 0) {
        const p = proposals[0]
        await sb.from('interactions').insert({
          lead_id: lead.id,
          user_id: userId,
          tipo: 'automacao',
          descricao: `Proposta "${p.titulo}" (R$ ${p.valor || 0}) solicitada via WhatsApp automaticamente.`,
        })
      }
    }

    if (lowerContent === 'aceito' || lowerContent === 'aceitar' || lowerContent.includes('aceito proposta')) {
      const { data: openProposals } = await sb
        .from('proposals')
        .select('id, titulo')
        .eq('lead_id', lead.id)
        .eq('status', 'Aberto')
        .order('created_at', { ascending: false })
        .limit(1)

      if (openProposals && openProposals.length > 0) {
        await sb
          .from('proposals')
          .update({ status: 'Aceito' })
          .eq('id', openProposals[0].id)

        await sb.from('interactions').insert({
          lead_id: lead.id,
          user_id: userId,
          tipo: 'automacao',
          descricao: `Cliente aceitou a proposta "${openProposals[0].titulo}" via WhatsApp automaticamente.`,
        })

        if (lead.status !== 'Fechado') {
          await sb.from('leads').update({ status: 'Fechado' }).eq('id', lead.id)
        }
      }
    }
  } catch (err) {
    console.error('processProposalAutomation error:', err)
  }
}
