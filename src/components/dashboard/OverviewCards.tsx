import { TrendingUp, Users, CheckCircle2 } from 'lucide-react'

export function OverviewCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100/50 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center shrink-0 bg-gray-50/50">
          <TrendingUp className="w-5 h-5 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[22px] font-bold tracking-tight text-gray-900 leading-none">
              $1,980,130
            </span>
            <span className="bg-yellow-100/80 text-yellow-700 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              +11% sem
            </span>
          </div>
          <p className="text-[13px] text-gray-500 font-medium mt-1.5 truncate">Valores Ganhos</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100/50 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center shrink-0 bg-gray-50/50">
          <Users className="w-5 h-5 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[22px] font-bold tracking-tight text-gray-900 leading-none">
              +89
            </span>
            <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              +12 hoje
            </span>
          </div>
          <p className="text-[13px] text-gray-500 font-medium mt-1.5 truncate">Novos Clientes</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100/50 flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="w-12 h-12 rounded-full border border-gray-100 flex items-center justify-center shrink-0 bg-gray-50/50">
          <CheckCircle2 className="w-5 h-5 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[22px] font-bold tracking-tight text-gray-900 leading-none">
              +31
            </span>
            <span className="bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              +6 hoje
            </span>
          </div>
          <p className="text-[13px] text-gray-500 font-medium mt-1.5 truncate">
            Tarefas Concluídas
          </p>
        </div>
      </div>
    </div>
  )
}
