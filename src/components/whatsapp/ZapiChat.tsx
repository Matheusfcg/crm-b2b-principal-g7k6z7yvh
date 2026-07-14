import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { ZApiProvider } from '@/providers/ZApiProvider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2, MessageCircle, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface ZapiMessage {
  id: string
  user_id: string
  instance_id: string | null
  message_id: string | null
  chat_id: string | null
  phone: string | null
  direction: string | null
  type: string | null
  text: string | null
  media_url: string | null
  status: string | null
  created_at: string | null
}

export function ZapiChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ZapiMessage[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (data) setMessages(data as ZapiMessage[])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchMessages()
    if (!user) return
    const channel = supabase
      .channel('zapi_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.message_id === payload.new.message_id)) return prev
            const newMsg = payload.new as ZapiMessage
            if (newMsg.direction === 'outgoing') {
              const withoutTemp = prev.filter(
                (m) => !(m.id.startsWith('temp_') && m.phone === newMsg.phone),
              )
              return [...withoutTemp, newMsg]
            }
            return [...prev, newMsg]
          })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchMessages])

  const conversations = messages.reduce(
    (acc, msg) => {
      const phone = msg.phone || msg.chat_id || 'unknown'
      if (!acc[phone]) acc[phone] = []
      acc[phone].push(msg)
      return acc
    },
    {} as Record<string, ZapiMessage[]>,
  )

  const conversationList = Object.entries(conversations)
    .map(([phone, msgs]) => ({ phone, lastMessage: msgs[msgs.length - 1] }))
    .sort(
      (a, b) =>
        new Date(b.lastMessage.created_at || 0).getTime() -
        new Date(a.lastMessage.created_at || 0).getTime(),
    )

  const selectedMessages = selectedPhone ? conversations[selectedPhone] || [] : []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedMessages.length])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || !selectedPhone) return
    const provider = new ZApiProvider()
    const tempId = `temp_${Date.now()}`
    const optimisticMsg: ZapiMessage = {
      id: tempId,
      user_id: user?.id || '',
      instance_id: null,
      message_id: tempId,
      chat_id: selectedPhone,
      phone: selectedPhone,
      direction: 'outgoing',
      type: 'text',
      text,
      media_url: null,
      status: 'sending',
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMsg])
    setInput('')
    setSending(true)
    try {
      const result = await provider.sendText(selectedPhone, text)
      if (!result.success) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)))
        toast.error(`Erro ao enviar: ${result.error}`)
      }
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)))
      toast.error(`Erro ao enviar: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 bg-background rounded-lg shadow-sm border border-border overflow-hidden h-[calc(100vh-380px)] min-h-[400px]">
      <div className="border-r border-border md:col-span-1 h-full overflow-hidden">
        <ScrollArea className="h-full">
          <div className="divide-y divide-border/50">
            {conversationList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhuma conversa ainda. Conecte sua instância Z-API e envie/receba mensagens.
              </div>
            ) : (
              conversationList.map(({ phone, lastMessage }) => (
                <button
                  key={phone}
                  onClick={() => setSelectedPhone(phone)}
                  className={cn(
                    'w-full flex flex-col gap-1 p-4 text-left hover:bg-muted/50 transition-colors',
                    selectedPhone === phone && 'bg-muted',
                  )}
                >
                  <span className="font-semibold text-foreground truncate">{phone}</span>
                  <span className="text-sm text-muted-foreground truncate">
                    {lastMessage.direction === 'outgoing' ? 'Você: ' : ''}
                    {lastMessage.text || lastMessage.type}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
      <div className="md:col-span-2 flex flex-col h-full bg-muted/20">
        {selectedPhone ? (
          <>
            <div className="px-4 py-3 bg-background border-b border-border flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-medium">
                {selectedPhone.substring(0, 2)}
              </div>
              <span className="font-semibold text-foreground">{selectedPhone}</span>
            </div>
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="flex flex-col space-y-2 max-w-4xl mx-auto">
                {selectedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'max-w-[75%] rounded-xl px-4 py-2 shadow-sm text-sm break-words',
                      msg.direction === 'outgoing'
                        ? 'bg-[#D9FDD3] dark:bg-[#005c4b] text-slate-900 dark:text-white self-end rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white self-start rounded-tl-none',
                    )}
                  >
                    {msg.media_url && msg.type === 'image' && (
                      <img
                        src={msg.media_url}
                        alt=""
                        className="rounded-lg max-w-full max-h-60 mb-1"
                      />
                    )}
                    {msg.media_url && msg.type === 'audio' && (
                      <audio controls src={msg.media_url} className="w-full max-w-[240px] mb-1" />
                    )}
                    {msg.media_url && msg.type === 'video' && (
                      <video
                        controls
                        src={msg.media_url}
                        className="rounded-lg max-w-full max-h-60 mb-1"
                      />
                    )}
                    {msg.media_url && msg.type === 'document' && (
                      <a
                        href={msg.media_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        📄 {msg.text || 'Documento'}
                      </a>
                    )}
                    {msg.text && msg.type !== 'document' && <span>{msg.text}</span>}
                    <span className="text-[10px] text-slate-500 block mt-1 flex items-center gap-1">
                      {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : ''}
                      {msg.status === 'sending' && <Clock className="h-3 w-3 animate-spin" />}
                      {msg.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500" />}
                    </span>
                  </div>
                ))}
                <div ref={bottomRef} className="h-1" />
              </div>
            </ScrollArea>
            <div className="p-4 bg-muted/50 border-t border-border flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())
                }
                placeholder="Digite uma mensagem"
                className="flex-1 bg-background rounded-full h-11 px-5"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-green-600 hover:bg-green-700 text-white rounded-full h-11 w-11"
              >
                {sending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  )
}
