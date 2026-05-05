import { useState, useEffect } from 'react'
import { Plus, Edit2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useAuth, UserProfile } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { UserForm } from '@/components/users/UserForm'

export default function Users() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users' as any)
        .select('*')
        .order('name')
      if (error) throw error
      setUsers(data || [])
    } catch (err: any) {
      toast({ title: 'Erro ao buscar usuários', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [profile])

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  if (profile?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
        <p className="text-muted-foreground max-w-md">
          Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar
          usuários.
        </p>
      </div>
    )
  }

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingUser(null)
  }

  return (
    <div className="flex flex-col gap-6 bg-card text-card-foreground rounded-lg p-6 sm:p-8 shadow-sm border min-h-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">
            Gerencie o acesso e permissões da equipe.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null)
            setIsFormOpen(true)
          }}
          className="bg-primary hover:bg-primary/90 w-full sm:w-auto rounded-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Equipe</h2>
          <p className="text-sm text-muted-foreground">Lista de usuários ativos no sistema.</p>
        </div>
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold">Nome</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Função</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="font-medium">
                    {u.name}{' '}
                    {u.email === profile?.email && (
                      <span className="text-muted-foreground font-normal ml-1">(Você)</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      u.role === 'admin'
                        ? 'bg-red-50 text-red-700 border-red-200 capitalize'
                        : u.role === 'gerente'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 capitalize'
                          : 'bg-green-50 text-green-700 border-green-200 capitalize'
                    }
                  >
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(u)}
                    title="Editar Usuário"
                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <UserForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        userToEdit={editingUser}
        onSuccess={fetchUsers}
      />
    </div>
  )
}
