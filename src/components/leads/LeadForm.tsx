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
import { leadsService } from '@/services/leads'

interface LeadFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (lead: any, isUpdate: boolean) => void
  initialData?: any | null
}

export function LeadForm({ open, onOpenChange, onSave, initialData }: LeadFormProps) {
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    empresa: '',
    contato: '',
    email: '',
    telefone: '',
    segmento: 'Outros',
    tamanho: '1-10',
    origem: 'Inbound',
    status: 'Novo',
  })

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialData && open) {
      setFormData({
        empresa: initialData.empresa || '',
        contato: initialData.contato || '',
        email: initialData.email || '',
        telefone: initialData.telefone || '',
        segmento: initialData.segmento || 'Outros',
        tamanho: initialData.tamanho || '1-10',
        origem: initialData.origem || 'Inbound',
        status: initialData.status || 'Novo',
      })
    } else if (!open) {
      setFormData({
        empresa: '',
        contato: '',
        email: '',
        telefone: '',
        segmento: 'Outros',
        tamanho: '1-10',
        origem: 'Inbound',
        status: 'Novo',
      })
    }
  }, [initialData, open])

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      let savedData
      if (initialData) {
        savedData = await leadsService.updateLead(initialData.id, formData)
        toast({
          title: 'Lead atualizado com sucesso!',
          description: `Os dados de ${formData.empresa} foram atualizados.`,
        })
      } else {
        savedData = await leadsService.createLead(formData)
        toast({
          title: 'Lead cadastrado com sucesso!',
          description: `${formData.empresa} foi adicionado aos seus leads.`,
        })
      }
      onSave(savedData, !!initialData)
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="empresa">Nome da Empresa</Label>
            <Input
              id="empresa"
              name="empresa"
              value={formData.empresa}
              onChange={(e) => handleChange('empresa', e.target.value)}
              required
              placeholder="Ex: TechCorp Solutions"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contato">Contato Principal</Label>
            <Input
              id="contato"
              name="contato"
              value={formData.contato}
              onChange={(e) => handleChange('contato', e.target.value)}
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
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                placeholder="ana@empresa.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                name="telefone"
                value={formData.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                required
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          {initialData && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                onValueChange={(val) => handleChange('status', val)}
                value={formData.status}
                required
              >
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
            <Select
              onValueChange={(val) => handleChange('segmento', val)}
              value={formData.segmento}
              required
            >
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
            <Select
              onValueChange={(val) => handleChange('tamanho', val)}
              value={formData.tamanho}
              required
            >
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
            <Select
              onValueChange={(val) => handleChange('origem', val)}
              value={formData.origem}
              required
            >
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
