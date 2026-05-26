import { useState } from 'react'
import { ChatSidebar } from './ChatSidebar'
import { ChatWindow } from './ChatWindow'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function ChatInterface({
  instance,
  onDisconnect,
}: {
  instance: any
  onDisconnect: () => void
}) {
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[600px] gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-medium text-slate-700">
            Conectado como {instance.instance_name}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDisconnect}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Desconectar
        </Button>
      </div>
      <Card className="flex-1 flex overflow-hidden border-slate-200">
        <div className="w-1/3 border-r border-slate-200 flex flex-col min-w-[300px]">
          <ChatSidebar
            instance={instance}
            selectedId={selectedConvId}
            onSelect={setSelectedConvId}
          />
        </div>
        <div className="flex-1 flex flex-col bg-slate-50/50">
          {selectedConvId ? (
            <ChatWindow instance={instance} conversationId={selectedConvId} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Selecione uma conversa para começar
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
