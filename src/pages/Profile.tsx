import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import {
  User,
  Mail,
  ShieldAlert,
  Palette,
  Sun,
  Moon,
  Camera,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export default function Profile() {
  const { profile, user, refreshProfile } = useAuth()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.name)
    }
  }, [profile])

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'avatar' | 'wallpaper',
  ) => {
    if (!user || !e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]
    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const bucket = type === 'avatar' ? 'avatars' : 'wallpapers'
    const column = type === 'avatar' ? 'avatar_url' : 'chat_wallpaper'

    if (type === 'avatar') setUploadingAvatar(true)
    else setUploadingWallpaper(true)

    try {
      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)
      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('users' as any)
        .update({ [column]: publicUrl })
        .eq('id', user.id)
      if (updateError) throw updateError

      await refreshProfile()
      toast({
        title: type === 'avatar' ? 'Foto de perfil atualizada' : 'Papel de parede atualizado',
      })
    } catch (error: any) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' })
    } finally {
      if (type === 'avatar') setUploadingAvatar(false)
      else setUploadingWallpaper(false)
    }
  }

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
              <div className="flex items-center gap-6 pb-4">
                <Avatar className="h-20 w-20 border-2 border-slate-100 dark:border-slate-800">
                  <AvatarImage
                    src={
                      profile?.avatar_url ||
                      `https://img.usecurling.com/ppl/thumbnail?seed=${user?.id}`
                    }
                  />
                  <AvatarFallback className="text-xl">
                    {profile?.name?.substring(0, 2).toUpperCase() || 'US'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md font-medium transition-colors">
                      {uploadingAvatar ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {uploadingAvatar ? 'Enviando...' : 'Alterar Foto'}
                    </div>
                  </Label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'avatar')}
                    disabled={uploadingAvatar}
                  />
                  <p className="text-xs text-slate-500 mt-2">JPG, PNG ou GIF. Máximo de 2MB.</p>
                </div>
              </div>

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

            <div className="grid gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <Label className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                Fundo do Chat (WhatsApp)
              </Label>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <div className="h-32 w-32 rounded-lg border-2 border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
                  {profile?.chat_wallpaper ? (
                    <img
                      src={profile?.chat_wallpaper}
                      alt="Chat Wallpaper"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full opacity-30 bg-[url('https://img.usecurling.com/p/200/200?q=doodle&color=gray')] bg-repeat bg-[length:50px]" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="wallpaper-upload" className="cursor-pointer inline-block">
                    <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-md font-medium transition-colors">
                      {uploadingWallpaper ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      {uploadingWallpaper ? 'Enviando...' : 'Escolher Imagem'}
                    </div>
                  </Label>
                  <input
                    id="wallpaper-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, 'wallpaper')}
                    disabled={uploadingWallpaper}
                  />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Esta imagem será usada como plano de fundo nas conversas do WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
