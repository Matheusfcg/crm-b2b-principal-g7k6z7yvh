import { MoreHorizontal, ArrowLeft, ArrowRight } from 'lucide-react'

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
      <div className="bg-card text-card-foreground rounded-lg p-6 shadow-sm border flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold">Agenda de Tarefas</h2>
          <div className="flex items-center gap-1 text-muted-foreground">
            <button className="hover:bg-muted rounded-md p-1.5 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 mb-6">
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-md border flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-md border flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <span className="font-semibold text-sm capitalize">
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {pendingTasks.length > 0 ? (
            pendingTasks.map((task, i) => {
              const date = new Date(task.prazo || new Date())
              return (
                <div
                  key={task.id || i}
                  className="flex items-center gap-4 p-3 rounded-md bg-muted/30 border"
                >
                  <div className="w-12 text-center border-r pr-4 shrink-0">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      {date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                    </p>
                    <p className="text-lg font-bold leading-tight">{date.getDate()}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{task.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {task.descricao || 'Sem descrição'}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
              Nenhuma tarefa pendente.
            </p>
          )}
        </div>
      </div>

      {/* Funil de Vendas */}
      <div className="bg-card text-card-foreground rounded-lg p-6 shadow-sm border flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-base font-semibold">Funil de Vendas</h2>
          <div className="flex items-center gap-1 text-muted-foreground">
            <button className="hover:bg-muted rounded-md p-1.5 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="mt-2">
          <h3 className="text-3xl font-bold tracking-tight leading-none">{leadsCount}</h3>
          <p className="text-sm text-muted-foreground mt-1">Leads Ativos</p>
        </div>
        <div className="mt-8 space-y-4 flex-1 flex flex-col justify-center">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span>Leads Totais</span>
              <span>100%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-slate-400 w-full transition-all duration-500"></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span>Qualificados</span>
              <span>{percQualificado}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${percQualificado}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-medium">
              <span>Propostas</span>
              <span>{percProposta}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${percProposta}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
