import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

export type Interaction = Database['public']['Tables']['interactions']['Row'] & {
  profile?: { name: string }
}

export const interactionsService = {
  async getInteractions(leadId: string) {
    const { data: interactions, error: interactionsError } = await supabase
      .from('interactions')
      .select('*')
      .eq('lead_id', leadId)
      .order('data', { ascending: false })

    if (interactionsError) throw interactionsError

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')

    if (profilesError) throw profilesError

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    return interactions.map((interaction) => ({
      ...interaction,
      profile: profileMap.get(interaction.user_id) || { name: 'Usuário Desconhecido' },
    })) as Interaction[]
  },

  async addInteraction(interaction: Database['public']['Tables']['interactions']['Insert']) {
    const { data, error } = await supabase
      .from('interactions')
      .insert(interaction)
      .select()
      .single()

    if (error) throw error
    return data
  },
}
