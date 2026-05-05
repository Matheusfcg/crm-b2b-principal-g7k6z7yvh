import { MoreHorizontal, ArrowLeft, ArrowRight, Expand } from 'lucide-react'

export function BottomWidgets({
  tasks = [],
  leadsCount = 0,
}: {
  tasks: any[]
  leadsCount: number
}) {
  const pendingTasks = tasks.filter((t) => t.status !== 'Concluída').slice(0, 3)

  const percQualificado = leadsCount > 0 ? 85 : 0
  const percProposta = leadsCount > 0 ? 65 : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Agenda de Tarefas */}
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100/50">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Agenda de Tarefas</h2>
          <div className="flex items-center gap-1 text-gray-400">
            <button className="hover:bg-gray-50 rounded-full p-2 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <button className="hover:bg-gray-50 rounded-full p-2 transition-colors">
              <Expand className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 mb-6">
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-600 transition-colors">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <span className="font-bold text-[15px] text-gray-900 capitalize">
            {new Date().toLocaleDateString('pt-BR', { month: 'long' })}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {pendingTasks.length > 0 ? (
            pendingTasks.map((task, i) => {
              const date = new Date(task.prazo || new Date())
              return (
                <div
                  key={task.id || i}
                  className="flex items-center gap-4 p-4 rounded-[1.25rem] bg-gray-50/80 border border-gray-100/50"
                >
                  <div className="w-12 text-center border-r border-gray-200/60 pr-4 shrink-0">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                    </p>
                    <p className="text-lg font-bold text-gray-900 leading-tight">
                      {date.getDate()}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[14px] text-gray-900 truncate">{task.titulo}</p>
                    <p className="text-[12px] text-gray-500 font-medium mt-0.5 truncate">
                      {task.descricao}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Nenhuma tarefa pendente.</p>
          )}
        </div>
      </div>

      {/* Funil de Vendas */}
      <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100/50 flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-gray-900">Funil de Vendas</h2>
          <div className="flex items-center gap-1 text-gray-400">
            <button className="hover:bg-gray-50 rounded-full p-2 transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <button className="hover:bg-gray-50 rounded-full p-2 transition-colors">
              <Expand className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-[32px] font-bold text-gray-900 tracking-tight leading-none">
            {leadsCount}
          </h3>
          <p className="text-[13px] text-gray-500 font-medium mt-2">Leads em Pipeline</p>
        </div>
        <div className="mt-8 space-y-3 flex-1 flex flex-col justify-center">
          <div className="h-8 w-full bg-blue-50 rounded-full overflow-hidden flex relative group">
            <div className="h-full bg-blue-600 w-full flex items-center px-4 transition-all duration-500 ease-out">
              <span className="text-[11px] text-white font-bold tracking-wide">LEADS (100%)</span>
            </div>
          </div>
          <div
            className="h-8 mx-auto bg-teal-50 rounded-full overflow-hidden flex relative group"
            style={{ width: `${percQualificado}%` }}
          >
            <div className="h-full bg-teal-500 w-full flex items-center px-4 transition-all duration-500 ease-out delay-75">
              <span className="text-[11px] text-white font-bold tracking-wide">QUALIFICADOS</span>
            </div>
          </div>
          <div
            className="h-8 mx-auto bg-yellow-50 rounded-full overflow-hidden flex relative group"
            style={{ width: `${percProposta}%` }}
          >
            <div className="h-full bg-yellow-400 w-full flex items-center px-4 transition-all duration-500 ease-out delay-150">
              <span className="text-[11px] text-gray-900 font-bold tracking-wide">PROPOSTAS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
