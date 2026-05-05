import { TrendingUp, Users, CheckCircle2 } from 'lucide-react'

export function OverviewCards({
  data,
}: {
  data: { wonValue: number; newClients: number; completedTasks: number }
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="bg-card text-card-foreground rounded-lg p-5 shadow-sm border flex items-center gap-4 transition-shadow hover:border-primary/40">
        <div className="w-12 h-12 rounded-md border flex items-center justify-center shrink-0 bg-muted/50">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-bold tracking-tight leading-none">
              R$ {data.wonValue.toLocaleString('pt-BR')}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium mt-1.5 truncate">
            Valores Ganhos
          </p>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-lg p-5 shadow-sm border flex items-center gap-4 transition-shadow hover:border-primary/40">
        <div className="w-12 h-12 rounded-md border flex items-center justify-center shrink-0 bg-muted/50">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-bold tracking-tight leading-none">
              +{data.newClients}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium mt-1.5 truncate">
            Novos Clientes (30d)
          </p>
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-lg p-5 shadow-sm border flex items-center gap-4 transition-shadow hover:border-primary/40">
        <div className="w-12 h-12 rounded-md border flex items-center justify-center shrink-0 bg-muted/50">
          <CheckCircle2 className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-bold tracking-tight leading-none">
              +{data.completedTasks}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium mt-1.5 truncate">
            Tarefas Concluídas
          </p>
        </div>
      </div>
    </div>
  )
}
