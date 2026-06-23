import { useState } from 'react'
import { ChatSidebar } from '@/components/whatsapp/ChatSidebar'
import { ChatWindow } from '@/components/whatsapp/ChatWindow'

export function WhatsAppChat({ instanceId }: { instanceId: string }) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden h-[700px]">
      <div className="border-r border-slate-200 md:col-span-1 h-full">
        <ChatSidebar
          instance={{ id: instanceId }}
          selectedId={selectedConversationId}
          onSelect={setSelectedConversationId}
        />
      </div>
      <div className="md:col-span-2 flex flex-col h-full bg-slate-50">
        {selectedConversationId ? (
          <ChatWindow instance={{ id: instanceId }} conversationId={selectedConversationId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-300"
              >
                <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
              </svg>
            </div>
            <p>Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  )
}
