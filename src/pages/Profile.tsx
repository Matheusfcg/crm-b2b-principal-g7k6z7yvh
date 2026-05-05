import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { User, Mail, ShieldAlert } from 'lucide-react'

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name)
    }
  }, [profile])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users' as any)
        .update({ name })
        .eq('id', user.id)

      if (error) throw error

      await supabase.auth.updateUser({
        data: { name },
      })

      await refreshProfile()
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      })
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Ocorreu um erro ao atualizar o perfil.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto w-full animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight" translate="no">
          Configurações de Perfil
        </h1>
        <p className="text-slate-500 mt-2">
          Gerencie suas informações pessoais e credenciais de acesso.
        </p>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
          <CardTitle className="text-xl" translate="no">
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Atualize seus dados para que a equipe saiba como se referir a você.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-slate-700 font-medium flex items-center gap-2">
                <User className="h-4 w-4 text-slate-400" />
                Nome Completo
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
                className="max-w-md focus-visible:ring-blue-500"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="text-slate-700 font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" />
                E-mail
              </Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="max-w-md bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-sm text-slate-500">
                O e-mail é utilizado para login e não pode ser alterado por aqui.
              </p>
            </div>

            <div className="grid gap-2 pt-2">
              <Label htmlFor="role" className="text-slate-700 font-medium flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-slate-400" />
                Nível de Acesso
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="role"
                  value={profile?.role || ''}
                  disabled
                  className="max-w-xs bg-slate-50 text-slate-500 capitalize cursor-not-allowed font-medium"
                />
                <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
                  Apenas administradores podem alterar o nível de acesso.
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto min-w-[150px] bg-slate-900 hover:bg-slate-800"
              >
                {loading ? 'Salvando alterações...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
