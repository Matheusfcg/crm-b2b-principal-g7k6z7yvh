import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { interactionsService, Interaction } from '@/services/interactions'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Phone, Mail, MessageSquare, Users, Plus } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Lead } from '@/pages/Leads'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Reunião: <Users className="h-4 w-4" />,
  Ligação: <Phone className="h-4 w-4" />,
  'E-mail': <Mail className="h-4 w-4" />,
  WhatsApp: <MessageSquare className="h-4 w-4" />,
}

const getLocalDatetime = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

interface LeadInteractionsProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LeadInteractions({ lead, open, onOpenChange }: LeadInteractionsProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const [tipo, setTipo] = useState<string>('Ligação')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(getLocalDatetime())

  useEffect(() => {
    if (open && lead) {
      loadInteractions()
      // Reset form
      setTipo('Ligação')
      setDescricao('')
      setData(getLocalDatetime())
    }
  }, [open, lead])

  const loadInteractions = async () => {
    if (!lead) return
    setLoading(true)
    try {
      const data = await interactionsService.getInteractions(lead.id)
      setInteractions(data)
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar interações',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead || !user) return

    if (!descricao.trim()) {
      toast({ title: 'A descrição é obrigatória', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      await interactionsService.addInteraction({
        lead_id: lead.id,
        user_id: user.id,
        tipo,
        descricao,
        data: new Date(data).toISOString(),
      })
      toast({ title: 'Interação registrada com sucesso!' })
      setDescricao('')
      setData(getLocalDatetime())
      loadInteractions()
    } catch (error: any) {
      toast({
        title: 'Erro ao registrar interação',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full flex flex-col h-full p-0">
        <div className="p-6 pb-2 border-b">
          <SheetHeader>
            <SheetTitle>Histórico de Interações</SheetTitle>
            <SheetDescription>
              Acompanhe as interações com <strong>{lead?.empresa}</strong>
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 border-b bg-muted/30">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger id="tipo">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Reunião">Reunião</SelectItem>
                      <SelectItem value="Ligação">Ligação</SelectItem>
                      <SelectItem value="E-mail">E-mail</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data e Hora</Label>
                  <Input
                    id="data"
                    type="datetime-local"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  placeholder="Resumo da interação..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Registrar Interação
                  </>
                )}
              </Button>
            </form>
          </div>

          <ScrollArea className="flex-1 p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : interactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhuma interação registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-0 pb-6 mt-2">
                {interactions.map((interaction, index) => (
                  <div
                    key={interaction.id}
                    className={`relative pl-8 ml-4 ${index !== interactions.length - 1 ? 'pb-8 border-l-2 border-muted' : ''}`}
                  >
                    <div className="absolute left-[-17px] top-[-4px] bg-background border-2 border-muted rounded-full text-foreground shadow-sm flex items-center justify-center h-8 w-8">
                      {TYPE_ICONS[interaction.tipo] || <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div className="bg-card border rounded-md p-4 shadow-sm mt-[-8px]">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] uppercase bg-primary/10 text-primary">
                              {interaction.profile?.name?.substring(0, 2) || 'US'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{interaction.profile?.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(interaction.data).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold mb-2">
                          {interaction.tipo}
                        </span>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {interaction.descricao}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
