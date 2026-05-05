import { supabase } from '@/lib/supabase/client'

export const interactionsService = {
  async getInteractionsByLead(leadId: string) {
    const { data, error } = await supabase
      .from('interactions')
      .select('*, users(name)')
      .eq('lead_id', leadId)
      .order('data', { ascending: false })
    if (error) throw error
    return data
  },
  async createInteraction(interaction: any) {
    const { data, error } = await supabase
      .from('interactions')
      .insert(interaction)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
