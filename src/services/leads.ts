import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type LeadRow = Database['public']['Tables']['leads']['Row']
export type LeadInsert = Database['public']['Tables']['leads']['Insert']
export type LeadUpdate = Database['public']['Tables']['leads']['Update']

export const leadsService = {
  async getLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async createLead(lead: Omit<LeadInsert, 'created_by'>) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw userError
    if (!userData.user) throw new Error('Usuário não autenticado')

    const { data, error } = await supabase
      .from('leads')
      .insert([{ ...lead, created_by: userData.user.id }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateLead(id: string, lead: LeadUpdate) {
    const { data, error } = await supabase.from('leads').update(lead).eq('id', id).select().single()

    if (error) throw error
    return data
  },

  async deleteLead(id: string) {
    const { error } = await supabase.from('leads').delete().eq('id', id)

    if (error) throw error
  },

  subscribeToChanges(callback: () => void) {
    return supabase
      .channel('leads_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposals' }, callback)
      .subscribe()
  },
}
