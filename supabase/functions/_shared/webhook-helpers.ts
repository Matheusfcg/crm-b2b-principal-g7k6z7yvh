export function extractText(msg: any): string {
  if (!msg) return ''
  if (typeof msg.text === 'string') return msg.text
  if (msg.text?.message) return msg.text.message
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text
  if (msg.extendedTextMessage?.caption) return msg.extendedTextMessage.caption
  if (msg.conversation) return msg.conversation
  if (msg.message) return msg.message
  if (msg.caption) return msg.caption
  if (msg.content) return msg.content
  return ''
}

export function normalizeType(msg: any): string {
  const rawType = (msg.type || '').toLowerCase()
  const typeMap: Record<string, string> = {
    chat: 'chat',
    text: 'chat',
    conversation: 'chat',
    image: 'image',
    imagemessage: 'image',
    video: 'video',
    videomessage: 'video',
    audio: 'audio',
    audiomessage: 'audio',
    ptt: 'audio',
    document: 'document',
    documentmessage: 'document',
    sticker: 'sticker',
    stickermessage: 'sticker',
  }
  return typeMap[rawType] || rawType || 'chat'
}

export function extractPhone(msg: any): string {
  return msg.phone || msg.from || msg.chatId || msg.sender || msg.recipient || ''
}

export function extractMessageId(msg: any): string {
  return msg.messageId || msg.id || msg.key?.id || ''
}

export async function logWebhook(
  sb: any,
  params: {
    userId: string | null
    instanceId: string | null
    endpoint: string
    payload: any
    response: any
    status: number
  },
) {
  try {
    await sb.from('whatsapp_logs').insert({
      user_id: params.userId,
      instance_id: params.instanceId,
      instance_name: params.instanceId,
      endpoint: params.endpoint,
      payload: params.payload || null,
      response: params.response || null,
      status: params.status,
    })
  } catch (err) {
    console.error('Log error:', err)
  }
}

export async function syncInteraction(
  sb: any,
  params: {
    userId: string | null
    phone: string
    text: string
    direction: string
    type: string
  },
) {
  try {
    const cleanPhone = params.phone.replace(/\D/g, '')
    if (!cleanPhone) return
    const { data: leads } = await sb
      .from('leads')
      .select('id, telefone')
      .ilike('telefone', `%${cleanPhone}%`)
      .limit(1)
    if (!leads || leads.length === 0) return
    const lead = leads[0]
    const description = params.text
      ? `[WhatsApp ${params.direction}] ${params.text}`.substring(0, 500)
      : `[WhatsApp ${params.direction}] Mídia (${params.type})`
    await sb.from('interactions').insert({
      lead_id: lead.id,
      user_id: params.userId,
      tipo: 'WhatsApp',
      descricao: description,
      data: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Interaction sync error:', err)
  }
}
