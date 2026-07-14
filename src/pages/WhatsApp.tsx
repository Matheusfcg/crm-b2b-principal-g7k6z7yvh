import { MessageCircle } from 'lucide-react'
import { ZapiSettings } from '@/components/whatsapp/ZapiSettings'
import { ZapiChat } from '@/components/whatsapp/ZapiChat'

export default function WhatsApp() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">WhatsApp</h1>
          <p className="text-slate-500 text-sm">
            Gerencie suas conversas e integração com WhatsApp via Z-API.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <ZapiSettings />
        <ZapiChat />
      </div>
    </div>
  )
}
