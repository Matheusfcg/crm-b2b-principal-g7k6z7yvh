import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { MessageSquare, User, Loader2, Send, Search, Filter, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Contact {
  id: string
  push_name: string | null
  remote_jid: string
  profile_picture: string | null
}

interface Conversation {
  id: string
  last_message: string | null
  updated_at: string | null
  unread_count: number
  contact: Contact | null
}

interface Message {
  id: string
  content: string | null
  from_me: boolean | null
  timestamp: string | null
  status: string
  type: string | null
}

const isValidUUID = (id: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

export function WhatsAppChat({ instanceId }: { instanceId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchConversations = async (isInitial = false) => {
    if (!instanceId || !isValidUUID(instanceId)) return
    if (isInitial) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id, last_message, updated_at, unread_count,
          contact:contacts(id, push_name, remote_jid, profile_picture)
        `)
        .eq('instance_id', instanceId)
        .order('updated_at', { ascending: false })

      if (!error && data) {
        const parsed = data.map((d: any) => ({
          ...d,
          contact: Array.isArray(d.contact) ? d.contact[0] : d.contact,
        })) as Conversation[]
        setConversations(parsed)
      }
    } catch (err) {
      console.error(err)
    } finally {
      if (isInitial) setLoading(false)
    }
  }

  const syncFromUazapi = async () => {
    if (!instanceId || !isValidUUID(instanceId)) {
      setSyncError('Nenhuma instância configurada.')
      toast.error('Nenhuma instância configurada. Conecte seu WhatsApp primeiro.')
      return
    }
    setSyncing(true)
    setSyncError(null)
    console.log('[DEBUG_WHATSAPP] Iniciando syncFromUazapi para a instância:', instanceId)
    try {
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('instance_name')
        .eq('id', instanceId)
        .single()

      if (instance?.instance_name) {
        console.log('[DEBUG_WHATSAPP] Invocando edge function para get_conversations')
        const res = await supabase.functions.invoke('whatsapp-uazapi', {
          body: { action: 'get_conversations', instanceName: instance.instance_name },
        })

        const isRateLimited =
          (res.error as any)?.status === 429 ||
          res.error?.message?.includes('429') ||
          (res.error?.name === 'FunctionsHttpError' &&
            (res.error as any).context?.status === 429) ||
          res.data?.code === 'RATE_LIMIT_REACHED'

        const isUnauthorized =
          (res.error as any)?.status === 401 ||
          (res.error as any)?.status === 403 ||
          res.error?.message?.includes('401') ||
          res.error?.message?.includes('403') ||
          (res.error?.name === 'FunctionsHttpError' &&
            ((res.error as any).context?.status === 401 ||
              (res.error as any).context?.status === 403)) ||
          res.data?.code === 'UNAUTHORIZED'

        if (isUnauthorized) {
          const msg =
            'Token inválido ou acesso negado (401/403). Verifique a configuração da instância.'
          setSyncError(msg)
          toast.error(msg)
          return
        }

        if (isRateLimited) {
          const msg =
            'Limite de requisições ou instâncias atingido (429). Por favor, verifique seu plano na Uazapi.'
          console.error('[DEBUG_WHATSAPP] Sync rate limited:', res.error)
          setSyncError(msg)
          toast.error(msg)
          return
        }

        if (res.error || res.data?.error) {
          const errMsg =
            res.data?.error ||
            res.error?.message ||
            'Não foi possível carregar as conversas. Verifique a conexão da sua instância.'
          console.error(
            '[DEBUG_WHATSAPP] Sync error from edge function:',
            errMsg,
            res.error || res.data?.error,
          )
          setSyncError(errMsg)
          toast.error(errMsg)
        } else {
          toast.success('Conversas sincronizadas com sucesso!')
          console.log('[DEBUG_WHATSAPP] Sync successful, fetching conversations.')
          await fetchConversations()
        }
      }
    } catch (err: any) {
      console.error('[DEBUG_WHATSAPP] Error syncing from Uazapi:', err)
      setSyncError('Não foi possível carregar as conversas. Verifique a conexão da sua instância.')
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    if (instanceId && isValidUUID(instanceId)) {
      fetchConversations(true).then(() => syncFromUazapi())

      const channel = supabase
        .channel('conversations-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
            filter: `instance_id=eq.${instanceId}`,
          },
          () => fetchConversations(false),
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [instanceId])

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConvId) return
      setMessagesLoading(true)
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', selectedConvId)
          .order('timestamp', { ascending: true })

        if (!error && data) {
          setMessages(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setMessagesLoading(false)
      }
    }

    fetchMessages()

    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConvId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConvId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSelectConv = async (convId: string) => {
    setSelectedConvId(convId)
    const conv = conversations.find((c) => c.id === convId)
    if (conv && conv.unread_count > 0) {
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)))
      await supabase.from('conversations').update({ unread_count: 0 }).eq('id', convId)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !selectedConvId) return

    const selectedConv = conversations.find((c) => c.id === selectedConvId)
    if (!selectedConv?.contact?.remote_jid) return

    const textToSend = replyText.trim()
    setReplyText('')
    setSending(true)

    if (!instanceId || !isValidUUID(instanceId)) {
      toast.error('ID da instância inválido.')
      setSending(false)
      setReplyText(textToSend)
      return
    }

    try {
      const { data: instance } = await supabase
        .from('whatsapp_instances')
        .select('instance_name')
        .eq('id', instanceId)
        .single()

      if (instance?.instance_name) {
        const { data, error } = await supabase.functions.invoke('whatsapp-uazapi', {
          body: {
            action: 'send_message',
            instanceName: instance.instance_name,
            remoteJid: selectedConv.contact.remote_jid,
            text: textToSend,
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
          setReplyText(textToSend)
          return
        }

        if (error || data?.error) {
          toast.error(data?.error || error?.message || 'Erro ao enviar mensagem.')
          setReplyText(textToSend)
        }
      }
    } catch (err: any) {
      toast.error('Erro ao enviar mensagem: ' + err.message)
      setReplyText(textToSend)
    } finally {
      setSending(false)
    }
  }

  const selectedConv = conversations.find((c) => c.id === selectedConvId)

  const filteredConversations = conversations.filter((c) => {
    if (showUnreadOnly && c.unread_count === 0) return false
    if (searchQuery) {
      const name = c.contact?.push_name || c.contact?.remote_jid || ''
      return name.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  return (
    <Card className="flex flex-col md:flex-row h-[600px] overflow-hidden border-slate-200 shadow-sm mt-6">
      {/* Sidebar: Conversations List */}
      <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50/50">
        <div className="p-4 border-b border-slate-200 bg-white flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold flex items-center gap-2 text-slate-800">
              <MessageSquare className="h-5 w-5" />
              Conversas
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => syncFromUazapi()}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Sincronizar
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar conversa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-slate-50 border-slate-200 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <Label
              htmlFor="unread-filter"
              className="text-xs text-slate-500 font-medium cursor-pointer"
            >
              Apenas não lidas
            </Label>
            <Switch
              id="unread-filter"
              checked={showUnreadOnly}
              onCheckedChange={setShowUnreadOnly}
              className="scale-75 origin-right"
            />
          </div>
        </div>

        {syncError && (
          <div className="bg-red-50 p-3 text-xs text-red-600 border-b border-red-100 flex items-center justify-between">
            <span>{syncError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => syncFromUazapi()}
              className="h-6 px-2 text-[10px] text-red-700 hover:bg-red-100"
            >
              Tentar Novamente
            </Button>
          </div>
        )}

        {syncing && conversations.length > 0 && (
          <div className="bg-blue-50 p-2 text-xs text-blue-600 flex items-center justify-center gap-2 border-b border-blue-100">
            <Loader2 className="h-3 w-3 animate-spin" />
            Sincronizando dados mais recentes...
          </div>
        )}

        <ScrollArea className="flex-1">
          {loading || (syncing && conversations.length === 0) ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-sm">Sincronizando conversas do WhatsApp...</span>
              <p className="text-[10px] text-slate-400 max-w-[200px] text-center mt-1">
                Isso pode levar alguns instantes. Aguarde.
              </p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Nenhuma conversa encontrada.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConv(conv.id)}
                  className={cn(
                    'p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-100 transition-colors',
                    selectedConvId === conv.id && 'bg-blue-50/50 hover:bg-blue-50/80',
                  )}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 border border-slate-200">
                      <AvatarImage
                        src={
                          conv.contact?.profile_picture?.startsWith('http')
                            ? conv.contact.profile_picture
                            : undefined
                        }
                      />
                      <AvatarFallback className="bg-slate-200 text-slate-600">
                        {conv.contact?.push_name?.charAt(0)?.toUpperCase() || (
                          <User className="h-5 w-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <p
                        className={cn(
                          'text-sm truncate',
                          conv.unread_count > 0
                            ? 'font-bold text-slate-900'
                            : 'font-medium text-slate-900',
                        )}
                      >
                        {conv.contact?.push_name ||
                          conv.contact?.remote_jid?.split('@')[0] ||
                          'Desconhecido'}
                      </p>
                      {conv.updated_at && (
                        <span
                          className={cn(
                            'text-xs',
                            conv.unread_count > 0 ? 'text-green-600 font-medium' : 'text-slate-400',
                          )}
                        >
                          {format(new Date(conv.updated_at), 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        'text-xs truncate',
                        conv.unread_count > 0 ? 'text-slate-700 font-medium' : 'text-slate-500',
                      )}
                    >
                      {conv.last_message || 'Nenhuma mensagem'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConvId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-white">
              <Avatar className="h-10 w-10 border border-slate-200">
                <AvatarImage
                  src={
                    selectedConv?.contact?.profile_picture?.startsWith('http')
                      ? selectedConv.contact.profile_picture
                      : undefined
                  }
                />
                <AvatarFallback className="bg-slate-200 text-slate-600">
                  {selectedConv?.contact?.push_name?.charAt(0)?.toUpperCase() || (
                    <User className="h-5 w-5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-slate-900">
                  {selectedConv?.contact?.push_name ||
                    selectedConv?.contact?.remote_jid?.split('@')[0] ||
                    'Desconhecido'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedConv?.contact?.remote_jid?.split('@')[0]}
                </p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50" ref={scrollRef}>
              {messagesLoading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 text-sm mt-10">
                  Nenhuma mensagem nesta conversa.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.from_me
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex w-full', isMe ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[75%] rounded-2xl px-4 py-2 shadow-sm text-sm',
                          isMe
                            ? 'bg-green-600 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none',
                        )}
                      >
                        {msg.content}
                        <div
                          className={cn(
                            'text-[10px] mt-1 text-right',
                            isMe ? 'text-green-200' : 'text-slate-400',
                          )}
                        >
                          {msg.timestamp ? format(new Date(msg.timestamp), 'HH:mm') : ''}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  placeholder="Digite uma mensagem..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={sending || messagesLoading}
                  className="flex-1 bg-slate-50 border-slate-200 focus-visible:ring-green-500"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!replyText.trim() || sending || messagesLoading}
                  className="bg-green-600 hover:bg-green-700 text-white shrink-0 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-4">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-slate-300" />
            </div>
            <div>
              <p className="font-medium text-slate-600 mb-1">WhatsApp Web</p>
              <p className="text-sm text-slate-400">
                Selecione uma conversa para começar a enviar mensagens
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
