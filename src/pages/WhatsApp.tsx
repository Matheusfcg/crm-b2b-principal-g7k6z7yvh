import { ZapiSettings } from '@/components/whatsapp/ZapiSettings'
import { ZapiChat } from '@/components/whatsapp/ZapiChat'
import { MessageCircle } from 'lucide-react'

export default function WhatsApp() {
  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
            <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">WhatsApp</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 ml-11">
          Gerencie suas conversas e integração com WhatsApp via Z-API.
        </p>
      </div>

      <div className="flex flex-col gap-6 flex-1">
        <ZapiSettings />
        <ZapiChat />
      </div>
    </div>
  )
}
