import { useEffect, useState } from 'react'
import { Users, FileText, CheckSquare, BarChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'

export default function Index() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    leads: 0,
    tarefas: 0,
    propostas: 0,
    pipeline: 0,
  })

  useEffect(() => {
    async function loadStats() {
      if (!profile) return

      try {
        let leadsQuery = supabase.from('leads').select('*', { count: 'exact', head: true })
        let tasksQuery = supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Pendente')
        let proposalsQuery = supabase.from('proposals').select('*', { count: 'exact', head: true })

        const role = profile.role?.toLowerCase()

        // Aplicação segura dos filtros com base no papel do usuário retornado do banco
        if (role !== 'admin' && role !== 'gerente') {
          leadsQuery = leadsQuery.eq('created_by', profile.id)
          tasksQuery = tasksQuery.eq('user_id', profile.id)
          proposalsQuery = proposalsQuery.eq('user_id', profile.id)
        }

        const [leadsRes, tasksRes, proposalsRes] = await Promise.all([
          leadsQuery,
          tasksQuery,
          proposalsQuery,
        ])

        setStats({
          leads: leadsRes.count || 0,
          tarefas: tasksRes.count || 0,
          propostas: proposalsRes.count || 0,
          pipeline: leadsRes.count || 0,
        })
      } catch (e) {
        console.error('Erro ao carregar estatísticas do painel:', e)
      }
    }
    loadStats()
  }, [profile])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Painel</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo(a) de volta! Aqui está o resumo de suas atividades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.leads}</div>
            <p className="text-xs text-muted-foreground mt-1">Leads na sua base</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Minhas Tarefas</CardTitle>
            <CheckSquare className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tarefas}</div>
            <p className="text-xs text-muted-foreground mt-1">Tarefas pendentes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Propostas</CardTitle>
            <FileText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.propostas}</div>
            <p className="text-xs text-muted-foreground mt-1">Documentos gerados</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gasoduto</CardTitle>
            <BarChart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pipeline}</div>
            <p className="text-xs text-muted-foreground mt-1">Pipeline acompanhado</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
