import { supabase } from '@/lib/supabase/client'

export const tasksService = {
  async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, leads:lead_id(empresa, contato, id)')
      .order('prazo', { ascending: true })
    if (error) throw error
    return data
  },
  async getTasksByLead(leadId: string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('lead_id', leadId)
      .order('prazo', { ascending: true })
    if (error) throw error
    return data
  },
  async createTask(task: any) {
    const { data, error } = await supabase.from('tasks').insert(task).select().maybeSingle()
    if (error) throw error
    return data
  },
  async updateTask(id: string, updates: any) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('Não foi possível atualizar a tarefa. Verifique as permissões.')
    return data
  },
}
