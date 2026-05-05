import { useState, useMemo } from 'react'
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
import { mockLeads, Lead } from '@/lib/mock-data'
import { useSearch } from '@/contexts/search-context'

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('Todos')
  const [segmentoFilter, setSegmentoFilter] = useState('Todos')
  const { searchQuery } = useSearch()

  const handleAddLead = (newLead: Lead) => {
    setLeads([newLead, ...leads])
  }

  const handleDeleteLead = (id: string) => {
    setLeads(leads.filter((l) => l.id !== id))
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
    <div className="flex flex-col gap-6 bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100/50 min-h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              Gerenciamento de Leads
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block">
              Mock Data
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Acompanhe e gerencie todos os seus contatos comerciais.
          </p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Lead
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
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

      <LeadsTable leads={filteredLeads} onDelete={handleDeleteLead} />

      <LeadForm open={isFormOpen} onOpenChange={setIsFormOpen} onSave={handleAddLead} />
    </div>
  )
}
