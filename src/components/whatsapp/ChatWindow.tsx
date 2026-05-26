import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
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
            return [...prev, payload.new].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
            )
          })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || !contact) return
    setSending(true)
    const text = input.trim()
    setInput('')

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-manage', {
        body: { action: 'send', number: contact.remote_jid, text },
      })
      if (error) throw new Error(error.message || 'Erro ao comunicar com a API')
      if (data?.error) throw new Error(data.error)
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`)
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const name = contact?.push_name || contact?.remote_jid?.split('@')[0] || 'Contato'

  return (
    <div className="flex flex-col h-full bg-[#EFEAE2]">
      <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center shadow-sm z-10">
        <div className="font-medium text-slate-800">{name}</div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col space-y-3 pb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[75%] rounded-lg px-4 py-2 shadow-sm text-sm break-words whitespace-pre-wrap',
                msg.from_me
                  ? 'bg-[#D9FDD3] text-slate-800 self-end rounded-tr-none'
                  : 'bg-white text-slate-800 self-start rounded-tl-none',
              )}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 bg-[#F0F2F5] flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-white border-0 shadow-sm focus-visible:ring-1 focus-visible:ring-blue-400"
          disabled={sending}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full h-10 w-10 shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 ml-1" />
          )}
        </Button>
      </div>
    </div>
  )
}
