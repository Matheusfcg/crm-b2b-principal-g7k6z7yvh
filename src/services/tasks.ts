import { supabase } from '@/lib/supabase/client'

export const tasksService = {
  async getTasks() {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, leads(empresa, contato, id)')
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
    const { data, error } = await supabase.from('tasks').insert(task).select().single()
    if (error) throw error
    return data
  },
  async updateTask(id: string, updates: any) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
