import { useEffect, useState } from 'react'
import { OverviewCards } from '@/components/dashboard/OverviewCards'
import { InteractionHistory } from '@/components/dashboard/InteractionHistory'
import { ProfileSidebar } from '@/components/dashboard/ProfileSidebar'
import { BottomWidgets } from '@/components/dashboard/BottomWidgets'
import { api } from '@/services/api'

export default function Index() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api.getDashboardData().then(setData)
  }, [])

  if (!data)
    return (
      <div className="p-8 text-center text-gray-500 font-medium mt-10">Carregando dashboard...</div>
    )

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full min-h-0">
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-6">
        <div className="flex flex-col gap-1 mt-2 px-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
            Informações do Cliente
          </h1>
          <p className="text-sm text-gray-500 font-medium">Visão geral e métricas principais</p>
        </div>

        <OverviewCards data={data.overview} />
        <InteractionHistory proposals={data.proposals} />
        <BottomWidgets tasks={data.tasks} leadsCount={data.leadsCount} />
      </div>

      <div className="w-full xl:w-[320px] shrink-0 pb-6">
        <ProfileSidebar />
      </div>
    </div>
  )
}
