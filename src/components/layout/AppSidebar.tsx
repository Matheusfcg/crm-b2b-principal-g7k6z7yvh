import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Kanban,
  Calendar,
  CheckSquare,
  FileText,
  BarChart,
  Settings,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

const navItems = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard },
  { title: 'Leads', path: '/leads', icon: Users },
  { title: 'Pipeline', path: '#', icon: Kanban },
  { title: 'Atividades', path: '#', icon: Calendar },
  { title: 'Tarefas', path: '#', icon: CheckSquare },
  { title: 'Propostas', path: '#', icon: FileText },
  { title: 'Relatórios', path: '#', icon: BarChart },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar className="border-none !bg-transparent z-10 w-24" collapsible="none">
      <div className="h-[calc(100vh-2rem)] bg-zinc-950 rounded-[2rem] m-4 flex flex-col items-center py-8 w-20 shadow-xl overflow-hidden shrink-0 transition-all">
        <SidebarContent className="w-full flex-1 flex mt-2 overflow-visible bg-transparent no-scrollbar">
          <SidebarGroup className="w-full flex flex-col gap-4 items-center border-none p-0">
            <SidebarMenu className="w-full flex flex-col gap-4 items-center">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <SidebarMenuItem key={item.title} className="w-full flex justify-center">
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={cn(
                        'w-12 h-12 flex items-center justify-center rounded-2xl p-0 transition-all duration-300',
                        isActive ? 'bg-zinc-800' : 'hover:bg-zinc-800/50',
                      )}
                    >
                      <Link
                        to={item.path}
                        className={cn(
                          'flex items-center justify-center w-full h-full text-zinc-400 hover:text-white',
                          isActive && 'text-white',
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <div className="mt-auto pt-4 w-full flex justify-center border-t border-white/5">
          <button className="w-12 h-12 flex items-center justify-center rounded-2xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </Sidebar>
  )
}
