import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Send, Loader2, Image as ImageIcon, Music, FileText, Video, Sticker } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { format, isToday, isYesterday } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const isValidUUID = (id: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

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

  const fetchData = async () => {
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
    setTimeout(() => scrollToBottom(false), 100)
  }

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
            setTimeout(() => scrollToBottom(true), 100)
            return newMsgs
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  const scrollToBottom = (smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' })
  }

  const handleSend = async () => {
    if (!input.trim() || !contact) return
    const text = input.trim()
    setInput('')
    setSending(true)

    if (!instance?.id || !isValidUUID(instance.id)) {
      toast.error('ID da instância inválido.')
      setSending(false)
      setInput(text)
      return
    }

    try {
      const { data: instanceData } = await supabase
        .from('whatsapp_instances')
        .select('instance_name')
        .eq('id', instance.id)
        .single()

      const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
        body: {
          action: 'send_message',
          instanceName: instanceData?.instance_name,
          remoteJid: contact.remote_jid,
          text,
        },
      })

      const isRateLimited =
        (error as any)?.status === 429 ||
        error?.message?.includes('429') ||
        (error?.name === 'FunctionsHttpError' && (error as any).context?.status === 429) ||
        data?.code === 'RATE_LIMIT_REACHED'

      if (isRateLimited) {
        toast.error(
          'Limite de requisições ou instâncias atingido (429). Por favor, verifique seu plano na Uazapi.',
        )
        setInput(text)
        return
      }

      if (error) throw new Error(error.message || 'Erro ao comunicar com a API')
      if (data?.error) throw new Error(data.error)
      scrollToBottom(true)
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`)
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const formatMessageTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    return format(new Date(dateStr), 'HH:mm')
  }

  const renderMessageContent = (msg: any) => {
    const type = msg.type || 'text'
    if (type === 'image')
      return (
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 shrink-0 text-slate-500" /> <span>{msg.content}</span>
        </div>
      )
    if (type === 'audio')
      return (
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 shrink-0 text-slate-500" /> <span>{msg.content}</span>
        </div>
      )
    if (type === 'document')
      return (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-500" /> <span>{msg.content}</span>
        </div>
      )
    if (type === 'video')
      return (
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 shrink-0 text-slate-500" /> <span>{msg.content}</span>
        </div>
      )
    if (type === 'sticker')
      return (
        <div className="flex items-center gap-2">
          <Sticker className="h-4 w-4 shrink-0 text-slate-500" /> <span>{msg.content}</span>
        </div>
      )

    return <span>{msg.content}</span>
  }

  const name = contact?.push_name || contact?.remote_jid?.split('@')[0] || 'Contato'

  return (
    <div className="flex flex-col h-full bg-[#EFEAE2] relative z-0">
      <div
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'url("https://img.usecurling.com/p/200/200?q=doodle&color=gray")',
          backgroundRepeat: 'repeat',
          backgroundSize: '150px',
        }}
      />

      <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-4 shadow-sm z-10 relative">
        <Avatar className="h-10 w-10 border border-slate-200 shadow-sm shrink-0">
          <AvatarImage src={contact?.profile_picture || undefined} />
          <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
            {name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">{name}</span>
          <span className="text-xs text-slate-500">{contact?.remote_jid?.split('@')[0]}</span>
        </div>
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
              const prevMsgDate = index > 0 ? new Date(messages[index - 1].timestamp || 0) : null
              const showDate =
                index === 0 ||
                format(msgDate, 'dd/MM/yyyy') !== format(prevMsgDate as Date, 'dd/MM/yyyy')

              return (
                <div key={msg.id} className="flex flex-col">
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
                  <div
                    className={cn(
                      'max-w-[85%] md:max-w-[75%] rounded-xl px-4 py-2 shadow-sm text-[15px] break-words whitespace-pre-wrap relative group',
                      msg.from_me
                        ? 'bg-[#D9FDD3] text-slate-800 self-end rounded-tr-none'
                        : 'bg-white text-slate-800 self-start rounded-tl-none',
                    )}
                  >
                    <div className="pb-3 pr-6 leading-relaxed">{renderMessageContent(msg)}</div>
                    <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
                      <span className="text-[10px] text-slate-500/80 font-medium select-none">
                        {formatMessageTime(msg.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} className="h-1" />
        </div>
      </ScrollArea>

      <div className="p-4 bg-[#F0F2F5] flex items-center gap-3 z-10 relative border-t border-slate-200/50">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Digite uma mensagem"
          className="flex-1 bg-white border-0 shadow-sm focus-visible:ring-1 focus-visible:ring-green-500 rounded-full h-11 px-5"
          disabled={sending || loading}
        />
        <Button
          size="icon"
          onClick={handleSend}
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
