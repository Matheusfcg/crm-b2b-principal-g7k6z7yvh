import { useState, useMemo, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { LeadForm } from '@/components/leads/LeadForm'
import { useSearch } from '@/contexts/search-context'
import { leadsService } from '@/services/leads'
import { useToast } from '@/hooks/use-toast'

export interface Lead {
  id: string
  empresa: string
  contato: string
  email: string
  telefone: string
  segmento: string
  tamanho: string
  origem: string
  status: string
  created_at: string
}

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [segmentoFilter, setSegmentoFilter] = useState('Todos')
  const { searchQuery } = useSearch()
  const { toast } = useToast()

  const fetchLeads = async () => {
    try {
      const data = await leadsService.getLeads()
      setLeads(data as Lead[])
    } catch (err: any) {
      toast({ title: 'Erro ao carregar leads', description: err.message, variant: 'destructive' })
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  const handleSaveLead = (savedLead: Lead, isUpdate: boolean) => {
    if (isUpdate) {
      setLeads((prev) => prev.map((l) => (l.id === savedLead.id ? savedLead : l)))
    } else {
      setLeads((prev) => [savedLead, ...prev])
    }
  }

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead)
    setIsFormOpen(true)
  }

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open)
    if (!open) {
      setTimeout(() => setEditingLead(null), 300)
    }
  }

  const handleDeleteLead = async (id: string) => {
    try {
      await leadsService.deleteLead(id)
      fetchLeads()
      toast({ title: 'Lead removido' })
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' })
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchStatus = statusFilter === 'Todos' || lead.status === statusFilter
      const matchSegmento = segmentoFilter === 'Todos' || lead.segmento === segmentoFilter
      const matchSearch =
        searchQuery === '' ||
        lead.empresa.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.contato.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase())

      return matchStatus && matchSegmento && matchSearch
    })
  }, [leads, statusFilter, segmentoFilter, searchQuery])

  return (
    <div className="flex flex-col gap-6 bg-card text-card-foreground rounded-lg p-6 sm:p-8 shadow-sm border min-h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Gerenciamento de Leads
            </h1>
          </div>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Acompanhe e gerencie todos os seus contatos comerciais.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingLead(null)
            setIsFormOpen(true)
          }}
          className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-muted/50 p-4 rounded-md border">
        <div className="w-full sm:w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Status</SelectItem>
              <SelectItem value="Novo">Novo</SelectItem>
              <SelectItem value="Contatado">Contatado</SelectItem>
              <SelectItem value="Qualificado">Qualificado</SelectItem>
              <SelectItem value="Perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={segmentoFilter} onValueChange={setSegmentoFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Segmento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os Segmentos</SelectItem>
              <SelectItem value="Tecnologia">Tecnologia</SelectItem>
              <SelectItem value="Serviços">Serviços</SelectItem>
              <SelectItem value="Indústria">Indústria</SelectItem>
              <SelectItem value="Varejo">Varejo</SelectItem>
              <SelectItem value="Outros">Outros</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          Mostrando {filteredLeads.length} leads
        </div>
      </div>

      <LeadsTable leads={filteredLeads} onDelete={handleDeleteLead} onEdit={handleEditLead} />

      <LeadForm
        open={isFormOpen}
        onOpenChange={handleFormOpenChange}
        onSave={handleSaveLead}
        initialData={editingLead}
      />
    </div>
  )
}
