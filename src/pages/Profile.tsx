import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { User, Mail, ShieldAlert, Palette, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

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
        <h1
          className="text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
          translate="no"
        >
          Configurações de Perfil
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Gerencie suas informações pessoais e credenciais de acesso.
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6">
            <CardTitle className="text-xl dark:text-slate-50" translate="no">
              Informações Pessoais
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Atualize seus dados para que a equipe saiba como se referir a você.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid gap-2">
                <Label
                  htmlFor="name"
                  className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2"
                >
                  <User className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  Nome Completo
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="max-w-md focus-visible:ring-blue-500 dark:bg-slate-950 dark:border-slate-800"
                />
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="email"
                  className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2"
                >
                  <Mail className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  E-mail
                </Label>
                <Input
                  id="email"
                  value={profile?.email || ''}
                  disabled
                  className="max-w-md bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  O e-mail é utilizado para login e não pode ser alterado por aqui.
                </p>
              </div>

              <div className="grid gap-2 pt-2">
                <Label
                  htmlFor="role"
                  className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2"
                >
                  <ShieldAlert className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  Nível de Acesso
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="role"
                    value={profile?.role || ''}
                    disabled
                    className="max-w-xs bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 capitalize cursor-not-allowed font-medium border-slate-200 dark:border-slate-800"
                  />
                  <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md">
                    Apenas administradores podem alterar o nível de acesso.
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto min-w-[150px] bg-slate-900 hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {loading ? 'Salvando alterações...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-6">
            <CardTitle className="text-xl dark:text-slate-50" translate="no">
              Preferências de Exibição
            </CardTitle>
            <CardDescription className="dark:text-slate-400">
              Personalize a aparência do CRM.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4">
              <Label className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                <Palette className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                Tema Visual
              </Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className={`flex-1 sm:flex-none justify-start gap-2 border-2 ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="h-4 w-4" /> Claro
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`flex-1 sm:flex-none justify-start gap-2 border-2 ${theme === 'dark' ? 'border-primary bg-primary/10 dark:bg-primary/20' : 'border-slate-200 dark:border-slate-800'}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="h-4 w-4" /> Escuro
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
