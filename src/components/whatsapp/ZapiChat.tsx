import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ZApiProvider } from '@/providers/ZApiProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Send, Search, MessageCircle, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Msg {
  id: string
  phone: string | null
  text: string | null
  direction: string | null
  type: string | null
  media_url: string | null
  created_at: string | null
}

interface Conv {
  phone: string
  name: string
  photo: string | null
  lastMessage: string
  lastTime: string
}

export function ZapiChat() {
  const [conversations, setConversations] = useState<Conv[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const providerRef = useRef<ZApiProvider | null>(null)
  if (!providerRef.current) providerRef.current = new ZApiProvider()

  const loadConversations = useCallback(async () => {
    const { data: msgs } = await supabase
      .from('whatsapp_messages')
      .select('phone, text, type, created_at')
      .order('created_at', { ascending: false })
      .limit(1000)

    const { data: leads } = await supabase.from('leads').select('telefone, contato, foto')

    const leadMap = new Map<string, { name: string; photo: string | null }>()
    leads?.forEach((l) => {
      const p = (l.telefone || '').replace(/\D/g, '')
      if (p) leadMap.set(p, { name: l.contato || p, photo: l.foto })
    })

    const convMap = new Map<string, Conv>()
    msgs?.forEach((m) => {
      const p = (m.phone || '').replace(/\D/g, '')
      if (!p || convMap.has(p)) return
      const lead = leadMap.get(p)
      convMap.set(p, {
        phone: p,
        name: lead?.name || p,
        photo: lead?.photo || null,
        lastMessage: m.text || `[${m.type}]`,
        lastTime: m.created_at || '',
      })
    })
    setConversations(Array.from(convMap.values()))
    setLoading(false)
  }, [])

  const loadMessages = useCallback(async (phone: string) => {
    const clean = phone.replace(/\D/g, '')
    const { data } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .ilike('phone', `%${clean}%`)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }, [])

  useEffect(() => {
    loadConversations()
    const channel = supabase
      .channel('whatsapp_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const msg = payload.new as Msg
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
          loadConversations()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadConversations])

  useEffect(() => {
    if (selected) loadMessages(selected)
  }, [selected, loadMessages])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !selected || sending) return
    setSending(true)
    const text = input.trim()
    setInput('')
    const result = await providerRef.current!.sendText(selected, text)
    if (!result.success) setInput(text)
    setSending(false)
  }

  const fmtTime = (iso: string) =>
    iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''

  const filtered = conversations.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <MessageCircle className="w-8 h-8 text-slate-400 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden bg-white dark:bg-slate-900">
      <div className={cn('flex flex-col w-full md:w-80 border-r', selected && 'hidden md:flex')}>
        <div className="p-3 border-b relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-4 text-center text-sm text-slate-500">
              Nenhuma conversa ainda. As mensagens recebidas aparecerão aqui.
            </p>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.phone}
                onClick={() => setSelected(conv.phone)}
                className={cn(
                  'flex items-center gap-3 w-full p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left',
                  selected === conv.phone && 'bg-slate-100 dark:bg-slate-800',
                )}
              >
                <Avatar className="w-10 h-10 shrink-0">
                  {conv.photo && <AvatarImage src={conv.photo} alt={conv.name} />}
                  <AvatarFallback>{conv.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{conv.name}</p>
                  <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{fmtTime(conv.lastTime)}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={cn('flex flex-col flex-1', !selected && 'hidden md:flex')}>
        {selected ? (
          <>
            <div className="flex items-center gap-3 p-3 border-b">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Avatar className="w-8 h-8">
                {conversations.find((c) => c.phone === selected)?.photo && (
                  <AvatarImage src={conversations.find((c) => c.phone === selected)?.photo || ''} />
                )}
                <AvatarFallback>{selected.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">
                {conversations.find((c) => c.phone === selected)?.name || selected}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'max-w-[75%] rounded-lg px-3 py-2 text-sm',
                      msg.direction === 'outbound'
                        ? 'self-end bg-green-500 text-white'
                        : 'self-start bg-slate-100 dark:bg-slate-800',
                    )}
                  >
                    {msg.text || (msg.media_url ? `📷 ${msg.type}` : '[Mensagem]')}
                    <span className="block text-xs opacity-60 mt-1">
                      {fmtTime(msg.created_at || '')}
                    </span>
                  </div>
                ))}
              </div>
              <div ref={endRef} />
            </div>
            <div className="flex gap-2 p-3 border-t">
              <Input
                placeholder="Digite uma mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                disabled={sending}
              />
              <Button onClick={handleSend} disabled={!input.trim() || sending} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageCircle className="w-12 h-12 mb-2" />
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  )
}
