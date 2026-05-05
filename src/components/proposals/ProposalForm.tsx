import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { LeadRow } from '@/services/proposals'

const proposalSchema = z.object({
  lead_id: z.string().min(1, 'Selecione um lead'),
  titulo: z.string().min(3, 'Título muito curto'),
  descricao: z.string().optional(),
  validade: z.string().optional(),
  observacoes: z.string().optional(),
  itens: z.array(
    z.object({
      nome: z.string().min(1, 'Nome é obrigatório'),
      quantidade: z.coerce.number().min(1, 'Mínimo de 1'),
      valor_unitario: z.coerce.number().min(0, 'Não pode ser negativo'),
    }),
  ),
})

export type ProposalFormData = z.infer<typeof proposalSchema>

interface Props {
  leads: LeadRow[]
  onSubmit: (d: ProposalFormData & { valor: number; user_id: string; status: string }) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function ProposalForm({ leads, onSubmit, onCancel, isSubmitting }: Props) {
  const { user } = useAuth()
  const form = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      lead_id: '',
      titulo: '',
      descricao: '',
      validade: '',
      observacoes: '',
      itens: [{ nome: '', quantidade: 1, valor_unitario: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'itens',
  })

  const itens = form.watch('itens')
  const valorTotal = itens.reduce(
    (acc, item) => acc + (item.quantidade || 0) * (item.valor_unitario || 0),
    0,
  )

  const handleSubmit = (data: ProposalFormData) => {
    if (!user) return
    const payload = {
      ...data,
      validade: data.validade || undefined,
      valor: valorTotal,
      user_id: user.id,
      status: 'Rascunho',
    }
    onSubmit(payload as any)
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Título da Proposta</Label>
          <Input {...form.register('titulo')} placeholder="Ex: Consultoria Anual" />
          {form.formState.errors.titulo && (
            <span className="text-xs text-destructive">{form.formState.errors.titulo.message}</span>
          )}
        </div>
        <div className="space-y-2">
          <Label>Lead vinculado</Label>
          <Select onValueChange={(v) => form.setValue('lead_id', v, { shouldValidate: true })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {leads.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.empresa} - {l.contato}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.lead_id && (
            <span className="text-xs text-destructive">
              {form.formState.errors.lead_id.message}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Validade</Label>
          <Input type="date" {...form.register('validade')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          {...form.register('descricao')}
          placeholder="Descreva o escopo da proposta..."
          className="h-20"
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center border-b pb-2">
          <Label className="text-base">Itens e Serviços</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ nome: '', quantidade: 1, valor_unitario: 0 })}
          >
            <Plus className="h-4 w-4 mr-1" /> Add Item
          </Button>
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <Input {...form.register(`itens.${index}.nome`)} placeholder="Nome do item" />
                {form.formState.errors.itens?.[index]?.nome && (
                  <span className="text-xs text-destructive">Obrigatório</span>
                )}
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  {...form.register(`itens.${index}.quantidade`)}
                  placeholder="Qtd"
                  min="1"
                />
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  step="0.01"
                  {...form.register(`itens.${index}.valor_unitario`)}
                  placeholder="R$ Unit"
                />
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2 text-lg font-bold text-primary">
          Total:{' '}
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            valorTotal,
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          {...form.register('observacoes')}
          placeholder="Condições de pagamento, termos, etc."
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar Proposta'}
        </Button>
      </div>
    </form>
  )
}
