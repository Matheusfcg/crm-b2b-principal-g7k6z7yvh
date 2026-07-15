import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { ZApiProvider } from '@/providers/ZApiProvider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageBubble } from '@/components/whatsapp/MessageBubble'
import { Send, Loader2, MessageCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
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

function formatTimestamp(date: string | null): string {
  if (!date) return ''
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Ontem'
  return format(d, 'dd/MM/yyyy')
}

function getAvatarColor(phone: string): string {
  const colors = [
    'bg-emerald-600',
    'bg-blue-600',
    'bg-purple-600',
    'bg-pink-600',
    'bg-orange-600',
    'bg-teal-600',
    'bg-indigo-600',
    'bg-red-600',
  ]
  const hash = phone.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function ZapiChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ZapiMessage[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const selectedPhoneRef = useRef<string | null>(null)

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
          const newMsg = payload.new as ZapiMessage
          setMessages((prev) => {
            if (prev.find((m) => m.message_id === newMsg.message_id)) return prev
            if (newMsg.direction === 'outgoing' || newMsg.direction === 'outbound') {
              const withoutTemp = prev.filter(
                (m) => !(m.id.startsWith('temp_') && m.phone === newMsg.phone),
              )
              return [...withoutTemp, newMsg]
            }
            return [...prev, newMsg]
          })
          if (
            newMsg.direction === 'inbound' &&
            newMsg.phone &&
            selectedPhoneRef.current !== newMsg.phone
          ) {
            toast.info(`Nova mensagem recebida`, {
              description: `${newMsg.phone}: ${newMsg.text || 'Mídia recebida'}`,
            })
          }
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
    .filter(({ phone }) => phone.toLowerCase().includes(search.toLowerCase()))
    .sort(
      (a, b) =>
        new Date(b.lastMessage.created_at || 0).getTime() -
        new Date(a.lastMessage.created_at || 0).getTime(),
    )

  const selectedMessages = selectedPhone ? conversations[selectedPhone] || [] : []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedMessages.length])

  useEffect(() => {
    selectedPhoneRef.current = selectedPhone
  }, [selectedPhone])

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
      direction: 'outbound',
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
        toast.error(`Erro ao enviar mensagem: ${result.error || 'Erro desconhecido'}`)
      }
    } catch (err: any) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)))
      toast.error(`Erro ao enviar mensagem: ${err?.message || 'Erro de conexão'}`)
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
    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 rounded-lg shadow-sm overflow-hidden min-h-[600px] border border-border">
      <div className="border-r border-border md:col-span-1 flex flex-col bg-white dark:bg-[#111b21]">
        <div className="px-4 py-3 bg-[#075E54] dark:bg-[#202c33] flex items-center justify-between">
          <h2 className="text-white font-semibold text-sm">Conversas</h2>
        </div>
        <div className="px-3 py-2 bg-[#f0f2f5] dark:bg-[#111b21]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa"
              className="pl-9 h-9 bg-white dark:bg-[#202c33] border-0 rounded-lg text-sm"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="divide-y divide-gray-100 dark:divide-[#202c33]">
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
                    'w-full flex items-center gap-3 p-3 text-left hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors',
                    selectedPhone === phone && 'bg-[#f0f2f5] dark:bg-[#202c33]',
                  )}
                >
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0',
                      getAvatarColor(phone),
                    )}
                  >
                    {phone.substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate text-sm">
                        {phone}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">
                        {formatTimestamp(lastMessage.created_at)}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground truncate block">
                      {lastMessage.direction === 'outgoing' || lastMessage.direction === 'outbound'
                        ? 'Você: '
                        : ''}
                      {lastMessage.text || lastMessage.type || ''}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="md:col-span-2 flex flex-col">
        {selectedPhone ? (
          <>
            <div className="px-4 py-2.5 bg-[#075E54] dark:bg-[#202c33] flex items-center gap-3 border-b border-[#054c44]">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center text-white font-medium text-sm',
                  getAvatarColor(selectedPhone),
                )}
              >
                {selectedPhone.substring(0, 2)}
              </div>
              <div className="flex-1">
                <span className="font-semibold text-white text-sm block">{selectedPhone}</span>
                <span className="text-xs text-[#8ed7c8] dark:text-[#8696a0]">online</span>
              </div>
            </div>

            <ScrollArea className="flex-1 whatsapp-chat-bg">
              <div className="flex flex-col space-y-1 p-4 max-w-4xl mx-auto min-h-full">
                {selectedMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    direction={msg.direction}
                    type={msg.type}
                    text={msg.text}
                    mediaUrl={msg.media_url}
                    status={msg.status}
                    createdAt={msg.created_at}
                  />
                ))}
                <div ref={bottomRef} className="h-1" />
              </div>
            </ScrollArea>

            <div className="p-3 bg-[#f0f2f5] dark:bg-[#202c33] flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())
                }
                placeholder="Digite uma mensagem"
                className="flex-1 bg-white dark:bg-[#2a3942] rounded-full h-11 px-5 border-0 text-sm text-foreground dark:text-white placeholder:text-gray-400"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-[#075E54] hover:bg-[#054c44] text-white rounded-full h-11 w-11 shrink-0"
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
          <div className="flex-1 flex flex-col items-center justify-center whatsapp-chat-bg text-center p-8">
            <MessageCircle className="h-16 w-16 mb-4 text-[#075E54] opacity-30" />
            <p className="text-[#54656f] dark:text-[#8696a0] text-lg font-light">
              Selecione uma conversa para começar
            </p>
            <p className="text-[#54656f] dark:text-[#8696a0] text-sm mt-1">
              ou inicie uma nova conversa
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
