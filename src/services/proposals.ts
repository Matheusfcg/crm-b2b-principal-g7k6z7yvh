import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type ProposalRow = Database['public']['Tables']['proposals']['Row']

export const proposalsService = {
  async getProposals() {
    const { data, error } = await supabase.from('proposals').select('*')
    if (error) throw error
    return data
  },
}
