import { useState } from 'react'
import { Lead } from '@/lib/mock-data'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface LeadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (lead: Lead) => void
}

export function LeadForm({ open, onOpenChange, onSave }: LeadFormProps) {
  const { toast } = useToast()
  const [segmento, setSegmento] = useState('')
  const [tamanho, setTamanho] = useState('')
  const [origem, setOrigem] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const newLead: Lead = {
      id: Math.random().toString(36).substring(7),
      empresa: formData.get('empresa') as string,
      contato: formData.get('contato') as string,
      email: formData.get('email') as string,
      telefone: formData.get('telefone') as string,
      segmento: segmento || 'Outros',
      status: 'Novo',
      dataCriacao: new Date().toISOString(),
    }

    onSave(newLead)

    toast({
      title: 'Lead cadastrado com sucesso!',
      description: `${newLead.empresa} foi adicionado aos seus leads.`,
    })

    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Novo Lead</SheetTitle>
          <SheetDescription>
            Preencha os dados abaixo para cadastrar um novo lead no CRM.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Nome da Empresa</Label>
            <Input id="empresa" name="empresa" required placeholder="Ex: TechCorp Solutions" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contato">Contato Principal</Label>
            <Input id="contato" name="contato" required placeholder="Ex: Ana Silva" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required placeholder="ana@empresa.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" name="telefone" required placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Segmento</Label>
            <Select onValueChange={setSegmento} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tecnologia">Tecnologia</SelectItem>
                <SelectItem value="Serviços">Serviços</SelectItem>
                <SelectItem value="Indústria">Indústria</SelectItem>
                <SelectItem value="Varejo">Varejo</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tamanho da Empresa</Label>
            <Select onValueChange={setTamanho} required>
              <SelectTrigger>
                <SelectValue placeholder="Número de funcionários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10 funcionários</SelectItem>
                <SelectItem value="11-50">11-50 funcionários</SelectItem>
                <SelectItem value="51-200">51-200 funcionários</SelectItem>
                <SelectItem value="200+">200+ funcionários</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Origem do Lead</Label>
            <Select onValueChange={setOrigem} required>
              <SelectTrigger>
                <SelectValue placeholder="Como nos conheceu?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inbound">Inbound</SelectItem>
                <SelectItem value="Outbound">Outbound</SelectItem>
                <SelectItem value="Indicação">Indicação</SelectItem>
                <SelectItem value="Evento">Evento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Salvar Lead
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
