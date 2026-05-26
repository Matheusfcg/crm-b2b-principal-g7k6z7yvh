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
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
          <span className="text-sm font-semibold text-slate-700 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
            Conectado: {instance.instance_name}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onDisconnect}
          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Desconectar
        </Button>
      </div>
      <Card className="flex-1 flex overflow-hidden border-slate-200 shadow-md rounded-xl">
        <div className="w-[380px] border-r border-slate-200 flex flex-col shrink-0 bg-white z-10">
          <ChatSidebar
            instance={instance}
            selectedId={selectedConvId}
            onSelect={setSelectedConvId}
          />
        </div>
        <div className="flex-1 flex flex-col bg-[#F0F2F5]">
          {selectedConvId ? (
            <ChatWindow instance={instance} conversationId={selectedConvId} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#F0F2F5]">
              <div className="max-w-md space-y-4">
                <div className="mx-auto w-48 h-48 mb-6">
                  <img
                    src="https://img.usecurling.com/p/400/400?q=chat%20app&color=gray&dpr=2"
                    alt="Chat"
                    className="opacity-40 grayscale object-contain"
                  />
                </div>
                <h2 className="text-2xl font-light text-[#41525d]">WhatsApp CRM Integration</h2>
                <p className="text-[#667781] text-sm">
                  Selecione uma conversa na barra lateral para visualizar as mensagens e interagir
                  com seus leads de forma integrada.
                </p>
                <div className="mt-8 pt-6 border-t border-slate-200/60 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Sincronização em tempo real ativa
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
