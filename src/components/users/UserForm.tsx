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
import { supabase } from '@/lib/supabase/client'
import { UserProfile } from '@/hooks/use-auth'

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userToEdit: UserProfile | null
  onSuccess: () => void
}

export function UserForm({ open, onOpenChange, userToEdit, onSuccess }: UserFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
  })

  useEffect(() => {
    if (userToEdit && open) {
      setFormData({
        name: userToEdit.name || '',
        email: userToEdit.email || '',
        password: '',
        role: userToEdit.role || 'vendedor',
      })
    } else if (!open) {
      setFormData({ name: '', email: '', password: '', role: 'vendedor' })
    }
  }, [userToEdit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (userToEdit) {
        const { error } = await supabase.rpc('admin_update_user', {
          target_user_id: userToEdit.id,
          new_name: formData.name,
          new_role: formData.role,
        })
        if (error) throw error
        toast({ title: 'Usuário atualizado com sucesso!' })
      } else {
        if (!formData.email || !formData.password) {
          throw new Error('E-mail e senha são obrigatórios para novos usuários')
        }
        const { error } = await supabase.rpc('admin_create_user', {
          new_email: formData.email,
          new_password: formData.password,
          new_name: formData.name,
          new_role: formData.role,
        })
        if (error) throw error
        toast({ title: 'Usuário criado com sucesso!' })
      }
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="mb-6">
          <SheetTitle>{userToEdit ? 'Editar Usuário' : 'Novo Usuário'}</SheetTitle>
          <SheetDescription>
            {userToEdit
              ? 'Altere o nome e o nível de acesso do usuário.'
              : 'Preencha os dados para criar um novo usuário no sistema. Certifique-se de usar um email válido e uma senha segura.'}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="joao@empresa.com"
              disabled={!!userToEdit}
            />
          </div>

          {!userToEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">Nível de Acesso (Role)</Label>
            <Select
              value={formData.role}
              onValueChange={(val) => setFormData({ ...formData, role: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um nível de permissão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendedor">Vendedor (Vê apenas próprios dados)</SelectItem>
                <SelectItem value="gerente">Gerente (Vê tudo, sem acesso a configs)</SelectItem>
                <SelectItem value="admin">Administrador (Acesso total)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Usuário'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
