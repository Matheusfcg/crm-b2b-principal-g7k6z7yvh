import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { User, MessageSquare } from 'lucide-react'

interface ChatSidebarProps {
  instance: any
  selectedId: string | null
  onSelect: (id: string) => void
}

export function ChatSidebar({ instance, selectedId, onSelect }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<any[]>([])

  const fetchConversations = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('instance_id', instance.id)
      .order('updated_at', { ascending: false })
    if (data) setConversations(data)
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

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
        <MessageSquare className="h-5 w-5 text-slate-500" />
        <h3 className="font-medium text-slate-800">Conversas</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-slate-50">
          {conversations.map((conv) => {
            const name =
              conv.contact?.push_name || conv.contact?.remote_jid?.split('@')[0] || 'Desconhecido'
            const isSelected = selectedId === conv.id
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-slate-50',
                  isSelected && 'bg-blue-50/50 hover:bg-blue-50/50',
                )}
              >
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarImage src={conv.contact?.profile_picture || undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-600">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-slate-900 truncate pr-2">{name}</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">
                    {conv.last_message || 'Nenhuma mensagem'}
                  </p>
                </div>
              </button>
            )
          })}
          {conversations.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">
              Nenhuma conversa encontrada.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
