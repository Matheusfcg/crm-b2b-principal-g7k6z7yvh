import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './layout/AppSidebar'
import { AppHeader } from './layout/AppHeader'

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#f4f6f9] overflow-hidden font-sans">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-transparent overflow-hidden px-4 py-4 gap-4 w-full">
          <AppHeader />
          <main className="flex-1 overflow-y-auto w-full max-w-[1600px] mx-auto animate-fade-in [&::-webkit-scrollbar]:hidden">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
