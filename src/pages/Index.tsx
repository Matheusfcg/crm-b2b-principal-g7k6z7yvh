import { OverviewCards } from '@/components/dashboard/OverviewCards'
import { SalesCharts } from '@/components/dashboard/SalesCharts'
import { RecentActivity } from '@/components/dashboard/RecentActivity'

export default function Index() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do seu funil de vendas e atividades.
        </p>
      </div>

      <OverviewCards />
      <SalesCharts />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">{/* Espaço para mais relatórios ou listas no futuro */}</div>
        <div className="lg:col-span-3">
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}
