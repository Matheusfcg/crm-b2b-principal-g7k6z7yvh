import { supabase } from '@/lib/supabase/client'

export interface WhatsappAccount {
  id: string
  user_id: string
  business_id: string
  waba_id: string
  phone_number_id: string
  display_phone_number: string | null
  access_token: string
  token_type: string | null
  created_at: string
}

export const whatsappAccountsService = {
  async getAccount(userId: string) {
    const { data, error } = await (supabase as any)
      .from('whatsapp_accounts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    return { data: data as WhatsappAccount | null, error }
  },

  async exchangeCode(code: string) {
    const { data, error } = await supabase.functions.invoke('meta-embedded-signup', {
      body: { code },
    })
    return { data, error }
  },

  async deleteAccount(userId: string) {
    const { error } = await (supabase as any)
      .from('whatsapp_accounts')
      .delete()
      .eq('user_id', userId)
    return { error }
  },
}
