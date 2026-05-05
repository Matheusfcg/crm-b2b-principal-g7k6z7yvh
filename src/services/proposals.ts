import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type ProposalItem = {
  nome: string
  quantidade: number
  valor_unitario: number
}

export type LeadRow = Database['public']['Tables']['leads']['Row']

export type ProposalRow = Database['public']['Tables']['proposals']['Row'] & {
  descricao?: string | null
  itens?: ProposalItem[] | null
  observacoes?: string | null
  validade?: string | null
  lead?: { empresa: string; contato: string } | null
}

export const proposalsService = {
  async getProposals() {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, lead:leads(empresa, contato)')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as ProposalRow[]
  },

  async getLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as LeadRow[]
  },

  async createProposal(proposal: Omit<ProposalRow, 'id' | 'created_at' | 'lead'>) {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) throw new Error('Usuário não autenticado')

    const { data, error } = await supabase
      .from('proposals')
      .insert({ ...proposal, user_id: (proposal as any).user_id || userData.user.id } as any)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async updateProposalStatus(id: string, status: string) {
    const { error } = await supabase.from('proposals').update({ status }).eq('id', id)
    if (error) throw error
  },
}
