import { MoreHorizontal, FileText, CheckCircle, XCircle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProposalRow } from '@/services/proposals'

interface ProposalsListProps {
  proposals: ProposalRow[]
  onUpdateStatus: (id: string, status: string) => void
  onGeneratePDF: (proposal: ProposalRow) => void
}

const statusColors: Record<string, string> = {
  Rascunho: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  Enviada: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Aprovada: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Rejeitada: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export function ProposalsList({ proposals, onUpdateStatus, onGeneratePDF }: ProposalsListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {proposals.map((prop) => (
            <TableRow key={prop.id}>
              <TableCell className="font-medium">{prop.titulo}</TableCell>
              <TableCell>{prop.lead?.empresa || 'N/A'}</TableCell>
              <TableCell>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  prop.valor,
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColors[prop.status] || 'bg-gray-100'}>
                  {prop.status}
                </Badge>
              </TableCell>
              <TableCell>
                {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
                  new Date(prop.created_at),
                )}
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
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onGeneratePDF(prop)}>
                      <FileText className="mr-2 h-4 w-4" /> Gerar PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Status</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onUpdateStatus(prop.id, 'Enviada')}>
                      <Send className="mr-2 h-4 w-4" /> Marcar como Enviada
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(prop.id, 'Aprovada')}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Aprovada
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdateStatus(prop.id, 'Rejeitada')}>
                      <XCircle className="mr-2 h-4 w-4" /> Marcar como Rejeitada
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {proposals.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Nenhuma proposta encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
