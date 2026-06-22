import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { MessageSquare, Search } from 'lucide-react'
import { format, isToday, isYesterday } from 'date-fns'

interface ChatSidebarProps {
  instance: any
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ChatSidebar({ instance, selectedId, onSelect }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('instance_id', instance.id)
      .order('updated_at', { ascending: false })

    if (data) setConversations(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchConversations()

    const channel = supabase
      .channel('conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `instance_id=eq.${instance.id}`,
        },
        () => {
          fetchConversations()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [instance.id])

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.contact?.push_name || conv.contact?.remote_jid || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isToday(date)) return format(date, 'HH:mm')
    if (isYesterday(date)) return 'Ontem'
    return format(date, 'dd/MM/yyyy')
  }

  const handleSelect = async (convId: string) => {
    onSelect(convId)
    // Optimistic unread count clear
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)))
    await supabase.from('conversations').update({ unread_count: 0 }).eq('id', convId)
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-slate-500" />
          <h3 className="font-semibold text-slate-800">Conversas</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar conversa..."
            className="pl-9 bg-white border-slate-200 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-slate-50">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const name =
                conv.contact?.push_name || conv.contact?.remote_jid?.split('@')[0] || 'Desconhecido'
              const isSelected = selectedId === conv.id
              const unreadCount = conv.unread_count || 0

              return (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50 relative',
                    isSelected && 'bg-blue-50/60 hover:bg-blue-50/60',
                  )}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full" />
                  )}
                  <Avatar className="h-12 w-12 border border-slate-200 shadow-sm shrink-0">
                    <AvatarImage
                      src={
                        conv.contact?.profile_picture?.startsWith('http')
                          ? conv.contact.profile_picture
                          : undefined
                      }
                    />
                    <AvatarFallback className="bg-blue-100 text-blue-600 font-medium">
                      {name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-slate-900 truncate pr-2">{name}</span>
                      <span
                        className={cn(
                          'text-xs shrink-0',
                          unreadCount > 0 ? 'text-green-600 font-medium' : 'text-slate-400',
                        )}
                      >
                        {formatTime(conv.updated_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <p
                        className={cn(
                          'text-sm truncate',
                          unreadCount > 0 ? 'text-slate-800 font-medium' : 'text-slate-500',
                        )}
                      >
                        {conv.last_message || 'Nenhuma mensagem'}
                      </p>
                      {unreadCount > 0 && (
                        <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
