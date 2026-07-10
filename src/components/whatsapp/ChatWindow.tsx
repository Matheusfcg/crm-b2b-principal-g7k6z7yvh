import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Loader2, Palette, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, isToday, isYesterday } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { useMediaUpload } from '@/hooks/use-media-upload'
import { ContactAvatar } from './ContactAvatar'
import { MessageBubble } from './MessageBubble'
import { WallpaperSettings } from './WallpaperSettings'

const isValidUUID = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)

export function ChatWindow({
  instance,
  conversationId,
}: {
  instance: any
  conversationId: string
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [contact, setContact] = useState<any>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { profile } = useAuth()
  const { uploading, upload } = useMediaUpload()

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data: conv } = await supabase
      .from('conversations')
      .select('contact:contacts(*)')
      .eq('id', conversationId)
      .single()
    if (conv) setContact(conv.contact)
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('timestamp', { ascending: true })
    if (msgs) setMessages(msgs)
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 100)
  }, [conversationId])

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.message_id === payload.new.message_id)) return prev
            const newMsgs = [...prev, payload.new].sort(
              (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime(),
            )
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            return newMsgs
          })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, fetchData])

  const handleSend = async (media?: { url: string; type: string; filename: string }) => {
    const text = input.trim()
    if (!text && !media) return
    if (!contact) return
    if (!instance?.id || !isValidUUID(instance.id)) {
      toast.error('ID da instância inválido.')
      if (text) setInput(text)
      return
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const optimisticMsg: any = {
      id: tempId,
      message_id: tempId,
      conversation_id: conversationId,
      from_me: true,
      content: text,
      type: media?.type || 'text',
      timestamp: new Date().toISOString(),
      status: 'sending',
      media_url: media?.url || null,
      media_filename: media?.filename || null,
      media_mimetype: null,
    }

    setInput('')
    setSending(true)
    setMessages((prev) => [...prev, optimisticMsg])
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

    try {
      const body: any = {
        action: 'send_message',
        instanceId: instance.id,
        to: contact.remote_jid,
        text,
      }
      if (media) {
        body.mediaType = media.type
        body.mediaUrl = media.url
        body.mediaFilename = media.filename
      }
      const { data, error } = await supabase.functions.invoke('whatsapp-meta', { body })
      if (error) throw new Error(error.message || 'Erro ao enviar mensagem')
      if (data?.error) throw new Error(data.error)

      const realId = data?.data?.messages?.[0]?.id
      setMessages((prev) => {
        const hasReal = realId && prev.some((m) => m.message_id === realId)
        if (hasReal) return prev.filter((m) => m.message_id !== tempId)
        return prev.map((m) =>
          m.message_id === tempId ? { ...m, message_id: realId || tempId, status: 'sent' } : m,
        )
      })
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => (m.message_id === tempId ? { ...m, status: 'failed' } : m)),
      )
      toast.error(`Erro ao enviar: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  const handleRetry = async (msg: any) => {
    if (!instance?.id || !contact) return
    setMessages((prev) =>
      prev.map((m) => (m.message_id === msg.message_id ? { ...m, status: 'sending' } : m)),
    )
    try {
      const body: any = {
        action: 'send_message',
        instanceId: instance.id,
        to: contact.remote_jid,
        text: msg.content || '',
      }
      if (msg.media_url) {
        body.mediaType = msg.type
        body.mediaUrl = msg.media_url
        body.mediaFilename = msg.media_filename
      }
      const { data, error } = await supabase.functions.invoke('whatsapp-meta', { body })
      if (error) throw new Error(error.message)
      if (data?.error) throw new Error(data.error)
      const realId = data?.data?.messages?.[0]?.id
      setMessages((prev) => {
        const hasReal = realId && prev.some((m) => m.message_id === realId)
        if (hasReal) return prev.filter((m) => m.message_id !== msg.message_id)
        return prev.map((m) =>
          m.message_id === msg.message_id
            ? { ...m, message_id: realId || msg.message_id, status: 'sent' }
            : m,
        )
      })
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => (m.message_id === msg.message_id ? { ...m, status: 'failed' } : m)),
      )
      toast.error(`Erro: ${err.message}`)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const media = await upload(file)
    if (media) await handleSend(media)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const wallpaper = profile?.chat_wallpaper
  const isSolid = wallpaper?.startsWith('solid:')
  const solidColor = isSolid ? wallpaper!.replace('solid:', '') : null
  const imageUrl = wallpaper && !isSolid ? wallpaper : null
  const defaultBg = 'https://img.usecurling.com/p/200/200?q=doodle&color=gray'
  const name = contact?.push_name || contact?.remote_jid?.split('@')[0] || 'Contato'

  return (
    <div
      className="flex flex-col h-full relative z-0"
      style={solidColor ? { backgroundColor: solidColor } : undefined}
    >
      {!solidColor && (
        <div
          className={cn(
            'absolute inset-0 z-0 pointer-events-none',
            imageUrl ? 'opacity-20' : 'opacity-40',
          )}
          style={{
            backgroundImage: `url("${imageUrl || defaultBg}")`,
            backgroundRepeat: imageUrl ? 'no-repeat' : 'repeat',
            backgroundSize: imageUrl ? 'cover' : '150px',
            backgroundPosition: 'center',
          }}
        />
      )}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-3 shadow-sm z-10 relative">
        <ContactAvatar contact={contact} className="h-10 w-10" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-semibold text-slate-800 truncate">{name}</span>
          <span className="text-xs text-slate-500 truncate">
            {contact?.remote_jid?.split('@')[0]}
          </span>
        </div>
        <WallpaperSettings>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Palette className="h-4 w-4 text-slate-500" />
          </Button>
        </WallpaperSettings>
      </div>
      <ScrollArea className="flex-1 px-4 py-6 z-10 relative">
        <div className="flex flex-col space-y-3 pb-4 max-w-4xl mx-auto">
          {loading ? (
            <div className="flex flex-col space-y-4 pt-4">
              <Skeleton className="h-16 w-64 self-start rounded-xl rounded-tl-none opacity-80" />
              <Skeleton className="h-12 w-48 self-end rounded-xl rounded-tr-none opacity-80" />
              <Skeleton className="h-20 w-72 self-start rounded-xl rounded-tl-none opacity-80" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex justify-center my-8">
              <div className="bg-[#FFF5C4] text-[#7A6917] text-xs px-4 py-2 rounded-lg shadow-sm text-center max-w-sm border border-[#FDEB9E]">
                As mensagens e chamadas deste chat são protegidas com criptografia de ponta a ponta.
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const msgDate = new Date(msg.timestamp || 0)
              const prevDate = index > 0 ? new Date(messages[index - 1].timestamp || 0) : null
              const showDate =
                index === 0 ||
                format(msgDate, 'dd/MM/yyyy') !== format(prevDate as Date, 'dd/MM/yyyy')
              return (
                <div key={msg.id || msg.message_id} className="flex flex-col">
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="bg-white/90 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm">
                        {isToday(msgDate)
                          ? 'Hoje'
                          : isYesterday(msgDate)
                            ? 'Ontem'
                            : format(msgDate, 'dd/MM/yyyy')}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    msg={msg}
                    onRetry={msg.status === 'failed' ? () => handleRetry(msg) : undefined}
                  />
                </div>
              )
            })
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>
      <div className="p-4 bg-[#F0F2F5] flex items-center gap-2 z-10 relative border-t border-slate-200/50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.zip"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-full h-11 w-11 shrink-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Digite uma mensagem"
          className="flex-1 bg-white border-0 shadow-sm focus-visible:ring-1 focus-visible:ring-green-500 rounded-full h-11 px-5"
          disabled={loading}
        />
        <Button
          size="icon"
          onClick={() => handleSend()}
          disabled={!input.trim() || sending || loading}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full h-11 w-11 shrink-0 shadow-sm transition-all disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5 ml-0.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
