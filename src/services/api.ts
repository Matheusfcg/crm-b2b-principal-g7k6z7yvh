import { supabase } from '@/lib/supabase/client'

export const API_URL = 'https://gmnaadyvmhzqahdtzbun.supabase.co/functions/v1/whatsapp-uazapi'

export const api = {
  invoke: async (action: string, payload: any) => {
    return await supabase.functions.invoke('whatsapp-uazapi', {
      body: { action, ...payload },
    })
  },
}
