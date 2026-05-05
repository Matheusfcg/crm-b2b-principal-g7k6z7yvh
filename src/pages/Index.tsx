import { OverviewCards } from '@/components/dashboard/OverviewCards'
import { InteractionHistory } from '@/components/dashboard/InteractionHistory'
import { ProfileSidebar } from '@/components/dashboard/ProfileSidebar'
import { BottomWidgets } from '@/components/dashboard/BottomWidgets'

export default function Index() {
  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full min-h-0">
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto [&::-webkit-scrollbar]:hidden pb-6">
        <div className="flex flex-col gap-1 mt-2 px-2">
          <h1 className="text-[28px] font-bold tracking-tight text-gray-900">
            Informações do Cliente
          </h1>
          <p className="text-sm text-gray-500 font-medium">Visão geral e métricas principais</p>
        </div>

        <OverviewCards />
        <InteractionHistory />
        <BottomWidgets />
      </div>

      <div className="w-full xl:w-[320px] shrink-0 pb-6">
        <ProfileSidebar />
      </div>
    </div>
  )
}
