import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export function useMediaUpload() {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)

  const upload = useCallback(
    async (file: File): Promise<{ url: string; type: string; filename: string } | null> => {
      if (!user) {
        toast.error('Usuário não autenticado.')
        return null
      }
      const maxSize = 16 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('Arquivo muito grande. Máximo 16MB.')
        return null
      }
      setUploading(true)
      try {
        const ext = file.name.split('.').pop() || 'bin'
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
        const { error } = await supabase.storage.from('chat-media').upload(path, file)
        if (error) throw error
        const {
          data: { publicUrl },
        } = supabase.storage.from('chat-media').getPublicUrl(path)

        let type = 'document'
        if (file.type.startsWith('image/')) type = 'image'
        else if (file.type.startsWith('audio/')) type = 'audio'
        else if (file.type.startsWith('video/')) type = 'video'

        return { url: publicUrl, type, filename: file.name }
      } catch (err: any) {
        toast.error(`Erro ao enviar arquivo: ${err.message}`)
        return null
      } finally {
        setUploading(false)
      }
    },
    [user],
  )

  return { uploading, upload }
}
