import { useState, useEffect } from 'react'
import { format, parseISO, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  Phone,
  Mail,
  Calendar as CalendarIcon,
  User,
  Plus,
} from 'lucide-react'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'

import { interactionsService } from '@/services/interactions'
import { tasksService } from '@/services/tasks'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

export function LeadInteractions({ lead, open, onOpenChange }: any) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('interactions')

  const [interactions, setInteractions] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])

  const [newInteraction, setNewInteraction] = useState({
    tipo: 'Ligação',
    descricao: '',
    data: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  })

  const [newTask, setNewTask] = useState({
    titulo: '',
    descricao: '',
    prazo: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    status: 'Pendente',
  })

  useEffect(() => {
    if (lead?.id && open) {
      loadData()
    }
  }, [lead?.id, open])

  const loadData = async () => {
    try {
      const [ints, tsks] = await Promise.all([
        interactionsService.getInteractionsByLead(lead.id),
        tasksService.getTasksByLead(lead.id),
      ])
      setInteractions(ints || [])
      setTasks(tsks || [])
    } catch (e: any) {
      toast({ title: 'Erro ao carregar dados', description: e.message, variant: 'destructive' })
    }
  }

  const handleCreateInteraction = async () => {
    if (!newInteraction.descricao) {
      return toast({ title: 'Descrição obrigatória', variant: 'destructive' })
    }
    try {
      await interactionsService.createInteraction({
        lead_id: lead.id,
        user_id: user?.id,
        tipo: newInteraction.tipo,
        descricao: newInteraction.descricao,
        data: new Date(newInteraction.data).toISOString(),
      })
      setNewInteraction({
        tipo: 'Ligação',
        descricao: '',
        data: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      })
      loadData()
      toast({ title: 'Interação registrada' })
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleCreateTask = async () => {
    if (!newTask.titulo) {
      return toast({ title: 'Título obrigatório', variant: 'destructive' })
    }
    try {
      await tasksService.createTask({
        lead_id: lead.id,
        user_id: user?.id,
        titulo: newTask.titulo,
        descricao: newTask.descricao,
        prazo: newTask.prazo ? new Date(newTask.prazo).toISOString() : null,
        status: newTask.status,
      })
      setNewTask({
        titulo: '',
        descricao: '',
        prazo: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        status: 'Pendente',
      })
      loadData()
      toast({ title: 'Tarefa criada' })
      setActiveTab('tasks')
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const toggleTaskStatus = async (task: any) => {
    const newStatus = task.status === 'Concluída' ? 'Pendente' : 'Concluída'
    try {
      await tasksService.updateTask(task.id, { status: newStatus })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)))
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const getIconForType = (tipo: string) => {
    switch (tipo) {
      case 'Reunião':
        return <CalendarIcon className="h-4 w-4" />
      case 'Ligação':
        return <Phone className="h-4 w-4" />
      case 'E-mail':
        return <Mail className="h-4 w-4" />
      case 'WhatsApp':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] flex flex-col h-full overflow-hidden p-0">
        <div className="p-6 pb-2">
          <SheetHeader>
            <SheetTitle>Detalhes do Lead</SheetTitle>
            <SheetDescription className="text-base font-medium text-foreground">
              {lead?.empresa}
            </SheetDescription>
            {lead?.contato && <p className="text-sm text-muted-foreground">{lead.contato}</p>}
          </SheetHeader>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="interactions">Interações</TabsTrigger>
              <TabsTrigger value="tasks">Tarefas</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="interactions"
            className="flex-1 flex flex-col overflow-hidden data-[state=active]:flex m-0"
          >
            <div className="p-6 bg-muted/30 border-y my-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newInteraction.tipo}
                      onValueChange={(v) => setNewInteraction((p) => ({ ...p, tipo: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ligação">Ligação</SelectItem>
                        <SelectItem value="Reunião">Reunião</SelectItem>
                        <SelectItem value="E-mail">E-mail</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data e Hora</Label>
                    <Input
                      type="datetime-local"
                      value={newInteraction.data}
                      onChange={(e) => setNewInteraction((p) => ({ ...p, data: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Resumo da interação..."
                    className="resize-none h-20"
                    value={newInteraction.descricao}
                    onChange={(e) =>
                      setNewInteraction((p) => ({ ...p, descricao: e.target.value }))
                    }
                  />
                </div>
                <Button onClick={handleCreateInteraction} className="w-full">
                  Registrar Interação
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6 pt-2">
              <div className="space-y-6">
                {interactions.map((int) => (
                  <div key={int.id} className="flex gap-4">
                    <div className="mt-1 bg-primary/10 text-primary p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                      {getIconForType(int.tipo)}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{int.tipo}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(int.data), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                        {int.descricao}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                        <User className="h-3 w-3" />
                        {int.profiles?.name || 'Usuário'}
                      </div>
                    </div>
                  </div>
                ))}
                {interactions.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Nenhuma interação registrada.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="tasks"
            className="flex-1 flex flex-col overflow-hidden data-[state=active]:flex m-0"
          >
            <div className="p-6 bg-muted/30 border-y my-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input
                    placeholder="Ex: Ligar para confirmar proposta"
                    value={newTask.titulo}
                    onChange={(e) => setNewTask((p) => ({ ...p, titulo: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prazo</Label>
                    <Input
                      type="datetime-local"
                      value={newTask.prazo}
                      onChange={(e) => setNewTask((p) => ({ ...p, prazo: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={newTask.status}
                      onValueChange={(v) => setNewTask((p) => ({ ...p, status: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pendente">Pendente</SelectItem>
                        <SelectItem value="Concluída">Concluída</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição (Opcional)</Label>
                  <Textarea
                    placeholder="Detalhes adicionais..."
                    className="resize-none h-16"
                    value={newTask.descricao}
                    onChange={(e) => setNewTask((p) => ({ ...p, descricao: e.target.value }))}
                  />
                </div>
                <Button onClick={handleCreateTask} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-6 pt-2">
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isOverdue =
                    task.prazo && task.status === 'Pendente' && isPast(parseISO(task.prazo))
                  return (
                    <div
                      key={task.id}
                      className={cn(
                        'flex items-start gap-3 p-3 border rounded-md transition-colors',
                        isOverdue ? 'border-red-200 bg-red-50/50' : 'bg-card',
                        task.status === 'Concluída' && 'opacity-60',
                      )}
                    >
                      <button onClick={() => toggleTaskStatus(task)} className="mt-0.5 shrink-0">
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
                        <p
                          className={cn(
                            'font-medium text-sm',
                            task.status === 'Concluída' && 'line-through text-muted-foreground',
                          )}
                        >
                          {task.titulo}
                        </p>
                        {task.prazo && (
                          <div
                            className={cn(
                              'flex items-center gap-1 mt-1 text-xs',
                              isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground',
                            )}
                          >
                            <Clock className="h-3 w-3" />
                            {format(parseISO(task.prazo), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {tasks.length === 0 && (
                  <div className="text-center text-muted-foreground text-sm py-4">
                    Nenhuma tarefa agendada.
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
