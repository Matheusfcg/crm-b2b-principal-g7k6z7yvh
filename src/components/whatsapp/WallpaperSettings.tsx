import { useState, useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Palette, Upload, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const SOLID_COLORS = [
  { name: 'Padrão', value: '' },
  { name: 'Azul', value: 'solid:#E1F2FB' },
  { name: 'Verde', value: 'solid:#E8F5E9' },
  { name: 'Bege', value: 'solid:#F5F0E8' },
  { name: 'Rosa', value: 'solid:#FCE4EC' },
  { name: 'Cinza', value: 'solid:#ECEFF1' },
]

export function WallpaperSettings({ children }: { children: React.ReactNode }) {
  const { user, profile, refreshProfile } = useAuth()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return
    const file = e.target.files[0]
    const ext = file.name.split('.').pop()
    const path = `${user.id}-${Date.now()}.${ext}`
    setUploading(true)
    try {
      const { error: upErr } = await supabase.storage.from('wallpapers').upload(path, file)
      if (upErr) throw upErr
      const {
        data: { publicUrl },
      } = supabase.storage.from('wallpapers').getPublicUrl(path)
      const { error: updErr } = await supabase
        .from('users' as any)
        .update({ chat_wallpaper: publicUrl })
        .eq('id', user.id)
      if (updErr) throw updErr
      await refreshProfile()
      toast.success('Papel de parede atualizado!')
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleColor = async (value: string) => {
    if (!user) return
    try {
      const { error } = await supabase
        .from('users' as any)
        .update({ chat_wallpaper: value || null })
        .eq('id', user.id)
      if (error) throw error
      await refreshProfile()
      toast.success('Cor de fundo atualizada!')
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-slate-500" />
            <Label className="font-semibold text-sm">Papel de Parede do Chat</Label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SOLID_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => handleColor(c.value)}
                className={cn(
                  'h-12 rounded-lg border-2 transition-all hover:scale-105',
                  profile?.chat_wallpaper === c.value
                    ? 'border-green-500 ring-2 ring-green-200'
                    : 'border-slate-200',
                )}
                style={{
                  backgroundColor: c.value ? c.value.replace('solid:', '') : undefined,
                  backgroundImage: !c.value
                    ? 'url("https://img.usecurling.com/p/100/100?q=doodle&color=gray")'
                    : undefined,
                  backgroundSize: !c.value ? '50px' : undefined,
                }}
                title={c.name}
              />
            ))}
          </div>
          <div className="pt-2 border-t border-slate-100">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Enviar Imagem
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
