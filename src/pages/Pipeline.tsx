import { useState, useEffect } from 'react'
import { User, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { leadsService, type LeadRow } from '@/services/leads'
import { proposalsService, type ProposalRow } from '@/services/proposals'

const COLUMNS = [
  { id: 'Novo', title: 'Novo Lead' },
  { id: 'Qualificação', title: 'Qualificação' },
  { id: 'Proposta Enviada', title: 'Proposta Enviada' },
  { id: 'Negociação', title: 'Negociação' },
  { id: 'Fechado Ganho', title: 'Fechado Ganho' },
  { id: 'Fechado Perdido', title: 'Fechado Perdido' },
]

export default function PipelinePage() {
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [proposals, setProposals] = useState<ProposalRow[]>([])
  const [draggedLead, setDraggedLead] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [l, p] = await Promise.all([leadsService.getLeads(), proposalsService.getProposals()])
      setLeads(l)
      setProposals(p)
    } catch {
      toast.error('Erro ao carregar dados do pipeline')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const channel = leadsService.subscribeToChanges(() => {
      fetchData()
    })

    return () => {
      if (channel) channel.unsubscribe()
    }
  }, [])

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const handleDrop = async (colId: string) => {
    setDragOverCol(null)
    if (!draggedLead) return

    const lead = leads.find((l) => l.id === draggedLead)
    if (!lead || lead.status === colId) {
      setDraggedLead(null)
      return
    }

    const previousLeads = [...leads]
    setLeads(leads.map((l) => (l.id === draggedLead ? { ...l, status: colId } : l)))

    try {
      await leadsService.updateLead(draggedLead, { status: colId })
    } catch {
      setLeads(previousLeads)
      toast.error('Erro ao atualizar o status do lead')
    }

    setDraggedLead(null)
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Pipeline de Vendas</h2>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        <div className="flex h-full min-w-max items-start gap-4">
          {COLUMNS.map((col) => {
            const colLeads = leads.filter(
              (l) => l.status === col.id || (col.id === 'Novo' && l.status === 'Novo Lead'),
            )

            const colTotal = colLeads.reduce((acc, lead) => {
              const leadProps = proposals.filter((p) => p.lead_id === lead.id)
              return acc + leadProps.reduce((sum, p) => sum + (p.valor || 0), 0)
            }, 0)

            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (dragOverCol !== col.id) setDragOverCol(col.id)
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(col.id)
                }}
                className={cn(
                  'flex max-h-full w-[320px] flex-col rounded-xl border bg-muted/30 transition-colors',
                  dragOverCol === col.id && 'bg-muted/60 ring-2 ring-primary/20',
                )}
              >
                <div className="flex items-center justify-between rounded-t-xl border-b bg-muted/50 p-3">
                  <h3 className="text-sm font-semibold">{col.title}</h3>
                  <span className="rounded-full border bg-background px-2 py-0.5 text-xs font-medium">
                    {colLeads.length}
                  </span>
                </div>
                <div className="flex justify-between border-b bg-background/30 p-2 text-xs text-muted-foreground">
                  <span>Valor Total:</span>
                  <span className="font-medium text-foreground">{formatCurrency(colTotal)}</span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {colLeads.map((lead) => {
                    const leadValue = proposals
                      .filter((p) => p.lead_id === lead.id)
                      .reduce((s, p) => s + (p.valor || 0), 0)

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move'
                          setDraggedLead(lead.id)
                        }}
                        onDragEnd={() => setDraggedLead(null)}
                        className={cn(
                          'cursor-grab rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md active:cursor-grabbing',
                          draggedLead === lead.id && 'opacity-50 ring-2 ring-primary',
                        )}
                      >
                        <h4 className="truncate text-sm font-medium" title={lead.empresa}>
                          {lead.empresa}
                        </h4>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{lead.contato}</span>
                        </div>
                        {leadValue > 0 && (
                          <div className="mt-3 flex justify-between border-t pt-2">
                            <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                              Propostas
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(leadValue)}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
