import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { proposalsService, ProposalRow, LeadRow } from '@/services/proposals'
import { ProposalsList } from '@/components/proposals/ProposalsList'
import { ProposalForm, ProposalFormData } from '@/components/proposals/ProposalForm'
import { generateProposalPDF } from '@/lib/pdf-generator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalRow[]>([])
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [propsData, leadsData] = await Promise.all([
        proposalsService.getProposals(),
        proposalsService.getLeads(),
      ])
      setProposals(propsData)
      setLeads(leadsData)
    } catch (error) {
      toast({ title: 'Erro', description: 'Erro ao carregar dados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProposal = async (
    data: ProposalFormData & { valor: number; user_id: string; status: string },
  ) => {
    try {
      setIsSubmitting(true)
      await proposalsService.createProposal(data)
      toast({ title: 'Sucesso', description: 'Proposta criada com sucesso!' })
      setIsModalOpen(false)
      fetchData()
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao criar proposta', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await proposalsService.updateProposalStatus(id, status)
      toast({ title: 'Sucesso', description: `Status atualizado para ${status}` })
      fetchData()
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao atualizar status', variant: 'destructive' })
    }
  }

  const handleGeneratePDF = (proposal: ProposalRow) => {
    generateProposalPDF(proposal)
  }

  const filteredProposals =
    statusFilter === 'all' ? proposals : proposals.filter((p) => p.status === statusFilter)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Propostas</h1>
          <p className="text-muted-foreground">Gerencie suas propostas comerciais e gere PDFs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="Rascunho">Rascunho</SelectItem>
              <SelectItem value="Enviada">Enviada</SelectItem>
              <SelectItem value="Aprovada">Aprovada</SelectItem>
              <SelectItem value="Rejeitada">Rejeitada</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Proposta
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-muted-foreground">Carregando...</div>
      ) : (
        <ProposalsList
          proposals={filteredProposals}
          onUpdateStatus={handleUpdateStatus}
          onGeneratePDF={handleGeneratePDF}
        />
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Proposta Comercial</DialogTitle>
          </DialogHeader>
          <ProposalForm
            leads={leads}
            onSubmit={handleCreateProposal}
            onCancel={() => setIsModalOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
