import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash, Eye } from 'lucide-react'
import { Lead } from '@/pages/Leads'
import { cn } from '@/lib/utils'

interface LeadsTableProps {
  leads: Lead[]
  onDelete: (id: string) => void
  onEdit: (lead: Lead) => void
  onView?: (lead: Lead) => void
}

const statusColors: Record<string, string> = {
  Novo: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-transparent',
  Contatado: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-transparent',
  Qualificado: 'bg-green-100 text-green-800 hover:bg-green-200 border-transparent',
  Perdido: 'bg-red-100 text-red-800 hover:bg-red-200 border-transparent',
}

export function LeadsTable({ leads, onDelete, onEdit, onView }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md bg-white">
        <p className="text-lg font-medium text-muted-foreground">Nenhum lead encontrado</p>
        <p className="text-sm text-muted-foreground">
          Tente ajustar seus filtros ou crie um novo lead.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead className="font-semibold">Empresa</TableHead>
            <TableHead className="font-semibold">Contato Principal</TableHead>
            <TableHead className="font-semibold">E-mail</TableHead>
            <TableHead className="font-semibold">Telefone</TableHead>
            <TableHead className="font-semibold">Segmento</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Data de Criação</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.empresa}</TableCell>
              <TableCell>{lead.contato}</TableCell>
              <TableCell className="text-muted-foreground">{lead.email}</TableCell>
              <TableCell>{lead.telefone}</TableCell>
              <TableCell>{lead.segmento}</TableCell>
              <TableCell>
                <Badge variant="outline" className={cn('font-normal', statusColors[lead.status])}>
                  {lead.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(lead.created_at).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 justify-end">
                  {onView && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onView(lead)
                      }}
                      title="Ver Histórico de Interações"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="sr-only">Ver Histórico</span>
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onEdit(lead)
                    }}
                    title="Editar"
                    className="h-8 w-8"
                  >
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Editar</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDelete(lead.id)
                    }}
                    title="Excluir"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Excluir</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
