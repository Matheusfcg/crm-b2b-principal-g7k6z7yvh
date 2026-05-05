import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckSquare, FileText, Kanban } from 'lucide-react'
import { leadsService } from '@/services/leads'
import { tasksService } from '@/services/tasks'
import { proposalsService } from '@/services/proposals'

export default function Index() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ leads: 0, tasks: 0, proposals: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [leads, tasks, proposals] = await Promise.all([
          leadsService.getLeads(),
          tasksService.getTasks(),
          proposalsService.getProposals(),
        ])
        setStats({
          leads: leads?.length || 0,
          tasks: tasks?.filter((t) => t.status === 'Pendente').length || 0,
          proposals: proposals?.length || 0,
        })
      } catch (error) {
        console.error('Erro ao buscar estatísticas', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="flex flex-col gap-6 bg-card text-card-foreground rounded-lg p-6 sm:p-8 shadow-sm border min-h-[calc(100vh-8rem)]">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Painel</h1>
        <p className="text-gray-500 text-sm mt-1 font-medium">
          Bem-vindo(a) de volta{profile?.name ? `, ${profile.name}` : ''}! Aqui está o resumo das
          suas atividades.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/leads">
          <Card className="hover:bg-muted/50 transition-colors h-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <Users className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.leads}</div>
              <p className="text-xs text-muted-foreground mt-1">Leads na sua base</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/tasks">
          <Card className="hover:bg-muted/50 transition-colors h-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Minhas Tarefas</CardTitle>
              <CheckSquare className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.tasks}</div>
              <p className="text-xs text-muted-foreground mt-1">Aguardando ação</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/proposals">
          <Card className="hover:bg-muted/50 transition-colors h-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Propostas</CardTitle>
              <FileText className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '-' : stats.proposals}</div>
              <p className="text-xs text-muted-foreground mt-1">Documentos gerados</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/pipeline">
          <Card className="hover:bg-muted/50 transition-colors h-full shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Gasoduto</CardTitle>
              <Kanban className="w-4 h-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Ver</div>
              <p className="text-xs text-muted-foreground mt-1">Acompanhar pipeline</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
