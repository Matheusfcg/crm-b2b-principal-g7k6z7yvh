export async function processProposalAutomation(
  sb: any,
  remoteJid: string,
  content: string,
  userId: string | null,
) {
  if (!content) return
  const lowerContent = content.toLowerCase()
  const isProposal = lowerContent.includes('proposta') || lowerContent.includes('orçamento')
  if (!isProposal) return

  // extract digits from remoteJid
  const phoneDigits = remoteJid.replace(/\D/g, '')
  if (!phoneDigits) return

  const { data: leads, error } = await sb
    .from('leads')
    .select('id, created_by, status')
    .or(`telefone.ilike.%${phoneDigits}%,whatsapp_external_id.eq.${remoteJid}`)

  if (error) {
    console.error('[Automation] Error fetching leads:', error)
    return
  }

  if (leads && leads.length > 0) {
    const lead = leads[0]

    // Check if proposal exists recently
    const { data: existingProposal } = await sb
      .from('proposals')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('status', 'Aberto')
      .limit(1)

    if (!existingProposal || existingProposal.length === 0) {
      await sb.from('proposals').insert({
        lead_id: lead.id,
        user_id: lead.created_by,
        titulo: 'Proposta via WhatsApp',
        valor: 0,
        status: 'Aberto',
        descricao: `Detectado automaticamente: "${content.substring(0, 150)}..."`,
      })
    }

    const statusesToAdvance = ['Novo', 'Novo Lead', 'Qualificação']
    if (statusesToAdvance.includes(lead.status)) {
      await sb.from('leads').update({ status: 'Proposta Enviada' }).eq('id', lead.id)
    }

    await sb.from('interactions').insert({
      lead_id: lead.id,
      user_id: lead.created_by,
      tipo: 'WhatsApp',
      descricao: `Proposta/Orçamento mencionado: ${content.substring(0, 100)}`,
    })
  }
}
