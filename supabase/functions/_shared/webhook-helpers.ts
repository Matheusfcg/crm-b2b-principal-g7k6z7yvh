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
    console.error('[logWebhook] Error:', err)
  }
}

export async function autoCreateContact(
  sb: any,
  params: {
    userId: string | null
    phone: string
    name?: string
    photoUrl?: string
  },
): Promise<string | null> {
  try {
    const cleanPhone = params.phone.replace(/\D/g, '')
    if (!cleanPhone) {
      console.log('[autoCreateContact] Empty phone, skipping')
      return null
    }

    console.log('[autoCreateContact] Checking for existing lead with phone:', cleanPhone)
    const { data: existing, error: lookupError } = await sb
      .from('leads')
      .select('id, contato, telefone')
      .ilike('telefone', `%${cleanPhone}%`)
      .limit(1)

    if (lookupError) {
      console.error('[autoCreateContact] Lookup error:', lookupError)
      return null
    }

    if (existing && existing.length > 0) {
      console.log('[autoCreateContact] Lead already exists:', existing[0].id)
      return existing[0].id
    }

    const contactName = params.name || `Lead ${cleanPhone}`
    console.log(
      '[autoCreateContact] Creating new lead for phone:',
      cleanPhone,
      'name:',
      contactName,
    )

    const { data, error } = await sb
      .from('leads')
      .insert({
        empresa: contactName,
        contato: contactName,
        email: '',
        telefone: cleanPhone,
        segmento: '',
        tamanho: '',
        origem: 'WhatsApp',
        status: 'Novo',
        created_by: params.userId,
        foto: params.photoUrl || null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[autoCreateContact] Insert error:', error)
      return null
    }

    console.log('[autoCreateContact] Created new lead:', data.id)
    return data.id
  } catch (err) {
    console.error('[autoCreateContact] Error:', err)
    return null
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

    if (!leads || leads.length === 0) {
      console.log('[syncInteraction] No lead found for phone:', cleanPhone)
      return
    }

    const lead = leads[0]
    const description = params.text
      ? `[WhatsApp ${params.direction}] ${params.text}`.substring(0, 500)
      : `[WhatsApp ${params.direction}] Mídia (${params.type})`

    const { error } = await sb.from('interactions').insert({
      lead_id: lead.id,
      user_id: params.userId,
      tipo: 'WhatsApp',
      descricao: description,
      data: new Date().toISOString(),
    })

    if (error) {
      console.error('[syncInteraction] Insert error:', error)
    } else {
      console.log('[syncInteraction] Created interaction for lead:', lead.id)
    }
  } catch (err) {
    console.error('[syncInteraction] Error:', err)
  }
}

export async function syncConversations(
  sb: any,
  instance: {
    instance_id: string | null
    instance_token: string | null
    client_token: string | null
    user_id: string | null
  },
) {
  try {
    const token = instance.instance_token || ''
    if (!instance.instance_id || !token) {
      console.log('[syncConversations] Missing instance credentials, skipping sync')
      return
    }

    const url = `https://api.z-api.io/instances/${instance.instance_id}/token/${token}/chats`
    const headers: Record<string, string> = {}
    if (instance.client_token) {
      headers['Client-Token'] = instance.client_token
    }

    console.log('[syncConversations] Fetching chats from Z-API:', url)
    const response = await fetch(url, { headers })
    const text = await response.text()
    let data: any = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = text
    }

    if (!response.ok) {
      console.log(
        '[syncConversations] Z-API /chats returned status:',
        response.status,
        '- plan limitation may apply',
      )
      return
    }

    const chatCount = Array.isArray(data) ? data.length : 0
    console.log('[syncConversations] Fetched', chatCount, 'chats from Z-API')

    if (Array.isArray(data) && instance.user_id) {
      for (const chat of data.slice(0, 50)) {
        const chatPhone = chat.chatId || chat.phone || ''
        const chatName = chat.name || chat.pushName || ''
        if (chatPhone) {
          await autoCreateContact(sb, {
            userId: instance.user_id,
            phone: chatPhone,
            name: chatName,
            photoUrl: chat.profilePicUrl || null,
          })
        }
      }
    }
  } catch (err) {
    console.error('[syncConversations] Error:', err)
  }
}
