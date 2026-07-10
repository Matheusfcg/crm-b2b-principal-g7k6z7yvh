import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MessageSquare, Search, Plus, MoreVertical, Settings, LogOut, Loader2 } from 'lucide-react'
import { ConversationItem } from './ConversationItem'

interface ChatSidebarProps {
  instance: any
  selectedId: string | null
  onSelect: (id: string) => void
  onAddNumber: () => void
  addingNumber: boolean
  onOpenConfig: () => void
  onDisconnect: () => void
  hasConfig: boolean
  sdkReady: boolean
}

export function ChatSidebar({
  instance,
  selectedId,
  onSelect,
  onAddNumber,
  addingNumber,
  onOpenConfig,
  onDisconnect,
  hasConfig,
  sdkReady,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(!!instance)
  const [search, setSearch] = useState('')

  const fetchConversations = async () => {
    if (!instance?.id) {
      setConversations([])
      setLoading(false)
      return
    }
    setLoading(true)
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
    if (!instance?.id) return
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
        () => fetchConversations(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [instance?.id])

  const filtered = conversations.filter((c) => {
    const name = c.contact?.push_name || c.contact?.remote_jid || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const handleSelect = async (convId: string) => {
    onSelect(convId)
    setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)))
    await supabase.from('conversations').update({ unread_count: 0 }).eq('id', convId)
  }

  const addDisabled = addingNumber || !sdkReady
  const addLabel = !sdkReady
    ? 'Carregando SDK...'
    : addingNumber
      ? 'Conectando...'
      : 'Adicionar Número'

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-slate-500" />
            <h3 className="font-semibold text-slate-800">Conversas</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onAddNumber}
              disabled={addDisabled}
              title={addLabel}
            >
              {addingNumber ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
            {hasConfig && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onOpenConfig}>
                    <Settings className="h-4 w-4 mr-2" /> Configuração Manual
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDisconnect} className="text-red-600">
                    <LogOut className="h-4 w-4 mr-2" /> Desconectar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {instance && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar conversa..."
              className="pl-9 bg-white border-slate-200 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y divide-slate-50">
          {!instance ? (
            <div className="p-8 text-center space-y-4">
              <p className="text-slate-400 text-sm">Nenhum número conectado.</p>
              <Button
                onClick={onAddNumber}
                disabled={addDisabled}
                className="bg-[#25D366] hover:bg-[#1da851] text-white"
              >
                {addingNumber ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {addLabel}
              </Button>
            </div>
          ) : loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))
          ) : filtered.length > 0 ? (
            filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isSelected={selectedId === conv.id}
                onSelect={handleSelect}
              />
            ))
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
