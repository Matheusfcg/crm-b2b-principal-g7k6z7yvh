import { supabase } from '@/lib/supabase/client'

export const api = {
  async getLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  async createLead(lead: any) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Não autenticado')

    const { data, error } = await supabase
      .from('leads')
      .insert({
        ...lead,
        created_by: user.id,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
  async updateLead(id: string, lead: any) {
    const { data, error } = await supabase.from('leads').update(lead).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteLead(id: string) {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) throw error
  },
  async getDashboardData() {
    const { data: proposals } = await supabase.from('proposals').select('*')
    const { data: leads } = await supabase.from('leads').select('id, created_at')
    const { data: tasks } = await supabase.from('tasks').select('*')

    const wonValue =
      proposals
        ?.filter((p) => p.status === 'Ganho')
        .reduce((acc, curr) => acc + Number(curr.valor), 0) || 0

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const newClients = leads?.filter((l) => new Date(l.created_at) >= thirtyDaysAgo).length || 0

    const completedTasks = tasks?.filter((t) => t.status === 'Concluída').length || 0

    return {
      overview: {
        wonValue,
        newClients,
        completedTasks,
      },
      proposals: proposals || [],
      tasks: tasks || [],
      leadsCount: leads?.length || 0,
    }
  },
}
