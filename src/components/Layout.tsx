import { Outlet } from 'react-router-dom'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './layout/AppSidebar'
import { AppHeader } from './layout/AppHeader'

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background overflow-hidden font-sans">
        <AppSidebar />
        <SidebarInset className="flex flex-1 flex-col bg-transparent overflow-hidden w-full">
          <AppHeader />
          <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 mx-auto animate-fade-in">
            <div className="mx-auto max-w-[1600px] w-full h-full">
              <Outlet />
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
