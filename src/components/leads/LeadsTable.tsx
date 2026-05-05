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
import { MoreHorizontal, Edit, Trash } from 'lucide-react'
import { Lead } from '@/lib/mock-data'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface LeadsTableProps {
  leads: Lead[]
  onDelete: (id: string) => void
}

const statusColors: Record<string, string> = {
  Novo: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-transparent',
  Contatado: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-transparent',
  Qualificado: 'bg-green-100 text-green-800 hover:bg-green-200 border-transparent',
  Perdido: 'bg-red-100 text-red-800 hover:bg-red-200 border-transparent',
}

export function LeadsTable({ leads, onDelete }: LeadsTableProps) {
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
    <div className="rounded-md border bg-white shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-50/50">
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
                {new Date(lead.dataCriacao).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Editar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(lead.id)}
                      className="text-destructive focus:bg-destructive/10"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      <span>Excluir</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
