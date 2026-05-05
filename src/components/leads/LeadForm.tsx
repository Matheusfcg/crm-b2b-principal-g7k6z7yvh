import { useState, useEffect } from 'react'
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
import { api } from '@/services/api'

interface LeadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
  initialData?: any | null
}

export function LeadForm({ open, onOpenChange, onSave, initialData }: LeadFormProps) {
  const { toast } = useToast()
  const [segmento, setSegmento] = useState('')
  const [tamanho, setTamanho] = useState('')
  const [origem, setOrigem] = useState('')
  const [status, setStatus] = useState('Novo')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData && open) {
      setSegmento(initialData.segmento)
      setTamanho(initialData.tamanho)
      setOrigem(initialData.origem)
      setStatus(initialData.status)
    } else if (!open) {
      setSegmento('')
      setTamanho('')
      setOrigem('')
      setStatus('Novo')
    }
  }, [initialData, open])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)

    const leadData = {
      empresa: formData.get('empresa') as string,
      contato: formData.get('contato') as string,
      email: formData.get('email') as string,
      telefone: formData.get('telefone') as string,
      segmento: segmento || 'Outros',
      tamanho: tamanho || '1-10',
      origem: origem || 'Inbound',
      status: status || 'Novo',
    }

    try {
      if (initialData) {
        await api.updateLead(initialData.id, leadData)
        toast({
          title: 'Lead atualizado com sucesso!',
          description: `Os dados de ${leadData.empresa} foram atualizados.`,
        })
      } else {
        await api.createLead(leadData)
        toast({
          title: 'Lead cadastrado com sucesso!',
          description: `${leadData.empresa} foi adicionado aos seus leads.`,
        })
      }
      onSave()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>{initialData ? 'Editar Lead' : 'Novo Lead'}</SheetTitle>
          <SheetDescription>
            {initialData
              ? 'Atualize os dados do lead abaixo.'
              : 'Preencha os dados abaixo para cadastrar um novo lead no CRM.'}
          </SheetDescription>
        </SheetHeader>

        <form key={initialData?.id || 'new'} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Nome da Empresa</Label>
            <Input
              id="empresa"
              name="empresa"
              defaultValue={initialData?.empresa}
              required
              placeholder="Ex: TechCorp Solutions"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contato">Contato Principal</Label>
            <Input
              id="contato"
              name="contato"
              defaultValue={initialData?.contato}
              required
              placeholder="Ex: Ana Silva"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={initialData?.email}
                required
                placeholder="ana@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                defaultValue={initialData?.telefone}
                required
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {initialData && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select onValueChange={setStatus} value={status} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Novo">Novo</SelectItem>
                  <SelectItem value="Contatado">Contatado</SelectItem>
                  <SelectItem value="Qualificado">Qualificado</SelectItem>
                  <SelectItem value="Perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Segmento</Label>
            <Select onValueChange={setSegmento} value={segmento} required>
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
            <Select onValueChange={setTamanho} value={tamanho} required>
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
            <Select onValueChange={setOrigem} value={origem} required>
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
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Lead'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
