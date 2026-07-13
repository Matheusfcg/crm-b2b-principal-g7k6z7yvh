import { supabase } from '@/lib/supabase/client'

export interface WhatsappConfig {
  id: string
  user_id: string
  phone_number_id: string
  waba_id: string
  access_token: string
  created_at: string
}

export const whatsappMetaService = {
  async getConfig(userId: string) {
    const { data, error } = await supabase
      .from('configuracoes_whatsapp')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return { data: data as WhatsappConfig | null, error }
  },

  async saveConfig(config: Partial<WhatsappConfig> & { user_id: string }) {
    const { data: existing } = await supabase
      .from('configuracoes_whatsapp')
      .select('id')
      .eq('user_id', config.user_id)
      .maybeSingle()

    if (existing) {
      const { data, error } = await supabase
        .from('configuracoes_whatsapp')
        .update({
          phone_number_id: config.phone_number_id,
          waba_id: config.waba_id,
          access_token: config.access_token,
        })
        .eq('id', existing.id)
        .select()
        .single()
      return { data, error }
    }

    const { data, error } = await supabase
      .from('configuracoes_whatsapp')
      .insert(config)
      .select()
      .single()
    return { data, error }
  },

  async testConnection(phoneNumberId: string, accessToken: string) {
    const { data, error } = await supabase.functions.invoke('whatsapp-meta', {
      body: {
        action: 'test_connection',
        phone_number_id: phoneNumberId,
        access_token: accessToken,
      },
    })
    return { data, error }
  },

  async deleteConfig(userId: string) {
    const { error } = await supabase.from('configuracoes_whatsapp').delete().eq('user_id', userId)
    return { error }
  },

  async getInstance(userId: string) {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', userId)
      .ilike('instance_name', 'meta_%')
      .maybeSingle()
    return { data, error }
  },

  async ensureInstance(userId: string, phoneNumberId: string, phone?: string) {
    const { data: existing } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('user_id', userId)
      .ilike('instance_name', 'meta_%')
      .maybeSingle()

    if (existing) {
      const desiredName = `meta_${phoneNumberId}`
      if (existing.instance_name !== desiredName) {
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .update({
            instance_name: desiredName,
            status: 'connected',
            server_url: 'https://graph.facebook.com',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()
        return { data, error }
      }
      return { data: existing, error: null }
    }

    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        user_id: userId,
        instance_name: `meta_${phoneNumberId}`,
        instance_token: 'meta_cloud_api',
        server_url: 'https://graph.facebook.com',
        status: 'connected',
        phone: phone || null,
      })
      .select()
      .single()
    return { data, error }
  },
}
