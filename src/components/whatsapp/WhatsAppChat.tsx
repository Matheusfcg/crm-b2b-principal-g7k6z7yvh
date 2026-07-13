import { useState } from 'react'
import { ChatSidebar } from '@/components/whatsapp/ChatSidebar'
import { ChatWindow } from '@/components/whatsapp/ChatWindow'
import { MessageCircle, Loader2 } from 'lucide-react'

interface WhatsAppChatProps {
  instance: any
  onAddNumber: () => void
  addingNumber: boolean
  onOpenConfig: () => void
  onDisconnect: () => void
  hasConfig: boolean
  sdkReady: boolean
  sdkSlowLoading: boolean
}

export function WhatsAppChat({
  instance,
  onAddNumber,
  addingNumber,
  onOpenConfig,
  onDisconnect,
  hasConfig,
  sdkReady,
  sdkSlowLoading,
}: WhatsAppChatProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const instanceId = instance?.id || null

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-220px)] min-h-[500px]">
      <div className="border-r border-slate-200 md:col-span-1 h-full overflow-hidden relative">
        {sdkSlowLoading && !sdkReady && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-blue-50 border-b border-blue-100 px-3 py-2 flex items-center gap-2 animate-fade-in">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
            <span className="text-xs text-blue-700 font-medium">Carregando SDK do Meta...</span>
          </div>
        )}
        <ChatSidebar
          instance={instance}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          onAddNumber={onAddNumber}
          addingNumber={addingNumber}
          onOpenConfig={onOpenConfig}
          onDisconnect={onDisconnect}
          hasConfig={hasConfig}
          sdkReady={sdkReady}
          sdkSlowLoading={sdkSlowLoading}
        />
      </div>
      <div className="md:col-span-2 flex flex-col h-full bg-slate-50 overflow-hidden">
        {selectedConversationId && instanceId ? (
          <ChatWindow instance={instance} conversationId={selectedConversationId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 px-8 text-center">
            <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="h-10 w-10 text-slate-300" />
            </div>
            <p className="text-lg font-medium text-slate-500">WhatsApp Web</p>
            <p className="text-sm mt-1 max-w-xs">
              {instanceId
                ? 'Selecione uma conversa para começar a enviar mensagens.'
                : 'Conecte um número WhatsApp Business para começar.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
