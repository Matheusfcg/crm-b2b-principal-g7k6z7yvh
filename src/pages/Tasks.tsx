import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { format, isPast, isToday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { tasksService } from '@/services/tasks'
import { useSearch } from '@/contexts/search-context'
import { cn } from '@/lib/utils'

export default function Tasks() {
  const [tasks, setTasks] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('Pendente')
  const [prazoFilter, setPrazoFilter] = useState('Todos')
  const [leadFilter, setLeadFilter] = useState('Todos')

  const { searchQuery } = useSearch()
  const { toast } = useToast()

  const loadTasks = async () => {
    try {
      const data = await tasksService.getTasks()
      setTasks(data || [])
    } catch (e: any) {
      toast({ title: 'Erro ao carregar tarefas', description: e.message, variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const uniqueLeads = useMemo(() => {
    const leadsMap = new Map()
    tasks.forEach((t) => {
      const leadData = Array.isArray(t.leads) ? t.leads[0] : t.leads
      if (leadData && leadData.id) {
        leadsMap.set(leadData.id, leadData)
      }
    })
    return Array.from(leadsMap.values())
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchStatus = statusFilter === 'Todos' || task.status === statusFilter

      let matchPrazo = true
      if (prazoFilter === 'Atrasadas') {
        matchPrazo = task.status === 'Pendente' && !!task.prazo && isPast(parseISO(task.prazo))
      } else if (prazoFilter === 'Hoje') {
        matchPrazo = !!task.prazo && isToday(parseISO(task.prazo))
      }

      const leadData = Array.isArray(task.leads) ? task.leads[0] : task.leads
      const matchLead = leadFilter === 'Todos' || (leadData && leadData.id === leadFilter)

      const matchSearch =
        !searchQuery || task.titulo.toLowerCase().includes(searchQuery.toLowerCase())

      return matchStatus && matchPrazo && matchLead && matchSearch
    })
  }, [tasks, statusFilter, prazoFilter, leadFilter, searchQuery])

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'Concluída' ? 'Pendente' : 'Concluída'
    try {
      await tasksService.updateTask(task.id, { status: newStatus })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))
      toast({ title: 'Tarefa atualizada' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col gap-6 bg-card text-card-foreground rounded-lg p-6 sm:p-8 shadow-sm border min-h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Minhas Tarefas</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Gerencie seus follow-ups e compromissos.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-4 bg-muted/50 p-4 rounded-md border">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os Status</SelectItem>
            <SelectItem value="Pendente">Pendentes</SelectItem>
            <SelectItem value="Concluída">Concluídas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={prazoFilter} onValueChange={setPrazoFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Prazo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Qualquer Prazo</SelectItem>
            <SelectItem value="Atrasadas">Atrasadas</SelectItem>
            <SelectItem value="Hoje">Hoje</SelectItem>
          </SelectContent>
        </Select>

        <Select value={leadFilter} onValueChange={setLeadFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrar por Lead" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Todos">Todos os Leads</SelectItem>
            {uniqueLeads.map((l: any) => (
              <SelectItem key={l.id} value={l.id}>
                {l.empresa}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-muted-foreground whitespace-nowrap">
          {filteredTasks.length} tarefas
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-col gap-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nenhuma tarefa encontrada com os filtros atuais.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isOverdue =
                task.prazo && task.status === 'Pendente' && isPast(parseISO(task.prazo))
              return (
                <div
                  key={task.id}
                  className={cn(
                    'flex items-start gap-4 p-4 border rounded-lg transition-colors',
                    isOverdue ? 'border-red-200 bg-red-50/50' : 'bg-card hover:bg-muted/50',
                    task.status === 'Concluída' && 'opacity-60',
                  )}
                >
                  <button
                    onClick={() => toggleStatus(task)}
                    className="mt-0.5 shrink-0 focus:outline-none focus:ring-2 focus:ring-ring rounded-full"
                  >
                    {task.status === 'Concluída' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle
                        className={cn(
                          'h-5 w-5',
                          isOverdue ? 'text-red-400' : 'text-muted-foreground',
                        )}
                      />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={cn(
                        'font-medium text-base truncate',
                        task.status === 'Concluída' && 'line-through text-muted-foreground',
                      )}
                    >
                      {task.titulo}
                    </h4>
                    {task.descricao && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {task.descricao}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-muted-foreground">
                      {(Array.isArray(task.leads) ? task.leads[0] : task.leads) && (
                        <span className="font-medium bg-secondary/50 px-2 py-1 rounded-md text-secondary-foreground truncate max-w-[200px]">
                          {(Array.isArray(task.leads) ? task.leads[0] : task.leads).empresa}
                        </span>
                      )}
                      {task.prazo && (
                        <span
                          className={cn(
                            'flex items-center gap-1.5',
                            isOverdue && 'text-red-600 font-semibold',
                          )}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {format(parseISO(task.prazo), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
