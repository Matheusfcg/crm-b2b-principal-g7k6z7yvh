import { useState } from 'react'
import { ChatSidebar } from '@/components/whatsapp/ChatSidebar'
import { ChatWindow } from '@/components/whatsapp/ChatWindow'
import { MessageCircle } from 'lucide-react'

interface WhatsAppChatProps {
  instanceId: string | null
  onAddNumber: () => void
  addingNumber: boolean
  onOpenConfig: () => void
  onDisconnect: () => void
  hasConfig: boolean
}

export function WhatsAppChat({
  instanceId,
  onAddNumber,
  addingNumber,
  onOpenConfig,
  onDisconnect,
  hasConfig,
}: WhatsAppChatProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-220px)] min-h-[500px]">
      <div className="border-r border-slate-200 md:col-span-1 h-full overflow-hidden">
        <ChatSidebar
          instance={instanceId ? { id: instanceId } : null}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
          onAddNumber={onAddNumber}
          addingNumber={addingNumber}
          onOpenConfig={onOpenConfig}
          onDisconnect={onDisconnect}
          hasConfig={hasConfig}
        />
      </div>
      <div className="md:col-span-2 flex flex-col h-full bg-slate-50 overflow-hidden">
        {selectedConversationId && instanceId ? (
          <ChatWindow instance={{ id: instanceId }} conversationId={selectedConversationId} />
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
