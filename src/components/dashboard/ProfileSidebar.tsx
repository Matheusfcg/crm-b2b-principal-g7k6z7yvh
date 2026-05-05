import { Edit2, Mail, Phone, ExternalLink, MessageCircle, Linkedin, Twitter } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export function ProfileSidebar() {
  return (
    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100/50 h-full flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <button className="text-gray-400 hover:text-gray-900 hover:bg-gray-50 p-2 rounded-full transition-colors">
          <Edit2 className="w-4 h-4" />
        </button>
        <button className="text-gray-400 hover:text-gray-900 hover:bg-gray-50 p-2 rounded-full transition-colors">
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <Avatar className="w-24 h-24 border-4 border-white shadow-sm">
            <AvatarImage
              src="https://img.usecurling.com/ppl/large?gender=female&seed=12"
              alt="Eva Robinson"
            />
            <AvatarFallback>ER</AvatarFallback>
          </Avatar>
        </div>
        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">Eva Robinson</h2>
        <p className="text-[13px] text-gray-500 font-medium mt-0.5">Machinery & Supply</p>

        <div className="flex items-center gap-3 mt-5">
          <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm">
            <Edit2 className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm">
            <Mail className="w-4 h-4" />
          </button>
          <button className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm">
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full h-px bg-gray-50 my-2"></div>

      <div className="flex-1 overflow-y-auto py-4 [&::-webkit-scrollbar]:hidden">
        <h3 className="font-bold text-[15px] mb-5 text-gray-900">Informação Detalhada</h3>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-6 flex justify-center text-gray-400">
              <Edit2 className="w-4 h-4" />
            </div>
            <div className="flex-1 border-b border-gray-50 pb-3 flex justify-between items-center group cursor-pointer">
              <div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                  Primeiro Nome
                </p>
                <p className="text-[14px] text-gray-900 font-medium">Eva</p>
              </div>
              <Edit2 className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-6 flex justify-center text-gray-400">
              <Edit2 className="w-4 h-4" />
            </div>
            <div className="flex-1 border-b border-gray-50 pb-3 flex justify-between items-center group cursor-pointer">
              <div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                  Sobrenome
                </p>
                <p className="text-[14px] text-gray-900 font-medium">Robinson</p>
              </div>
              <Edit2 className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-6 flex justify-center text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <div className="flex-1 border-b border-gray-50 pb-3 flex justify-between items-center group cursor-pointer">
              <div className="min-w-0 pr-2">
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                  Email
                </p>
                <p className="text-[14px] text-gray-900 font-medium truncate">
                  evaa@alabamamachinery.com
                </p>
              </div>
              <Edit2 className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-6 flex justify-center text-gray-400">
              <Phone className="w-4 h-4" />
            </div>
            <div className="flex-1 border-b border-gray-50 pb-3 flex justify-between items-center group cursor-pointer">
              <div>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                  Telefone
                </p>
                <p className="text-[14px] text-gray-900 font-medium">+911 120 222 313</p>
              </div>
              <Edit2 className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-6 flex justify-center text-gray-400 mt-1">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 pb-2">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-2">
                Fontes
              </p>
              <div className="flex gap-2">
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  <Linkedin className="w-3.5 h-3.5 fill-current" />
                </button>
                <button className="w-7 h-7 flex items-center justify-center rounded-full bg-sky-50 text-sky-500 hover:bg-sky-100 transition-colors">
                  <Twitter className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
