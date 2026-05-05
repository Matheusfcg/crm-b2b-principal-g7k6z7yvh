import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  FileText,
  BarChart,
  Settings,
  UserCog,
  Moon,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'

const navItems = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard },
  { title: 'Leads', path: '/leads', icon: Users },
  { title: 'Pipeline', path: '/pipeline', icon: Kanban },
  { title: 'Tarefas', path: '/tasks', icon: CheckSquare },
  { title: 'Propostas', path: '/proposals', icon: FileText },
  { title: 'Relatórios', path: '#', icon: BarChart },
]

export function AppSidebar() {
  const location = useLocation()
  const { profile } = useAuth()

  const isAdmin = profile?.role?.toLowerCase() === 'admin'

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-white">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-slate-100">
        <div className="flex items-center gap-3 font-bold text-lg px-4 w-full text-slate-900">
          <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold shrink-0">
            <span className="text-lg leading-none">A</span>
          </div>
          <span className="group-data-[collapsible=icon]:hidden truncate text-[1.1rem] tracking-tight border-[#ffffff] text-[#ffffff] font-medium">
            CRMVexaView
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarGroup>
          <div className="px-4 text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            Menu Principal
          </div>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    className={`h-10 transition-colors mb-1 ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-semibold rounded-lg'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg'
                    }`}
                  >
                    <Link to={item.path} className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}

            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/users'}
                  tooltip="Usuários"
                  className={`h-10 transition-colors mt-2 ${location.pathname === '/users' ? 'bg-slate-100 text-slate-900 font-semibold rounded-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg'}`}
                >
                  <Link to="/users" className="flex items-center gap-3">
                    <UserCog className="h-5 w-5 shrink-0" />
                    <span>Usuários</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-100 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Modo Escuro"
              className="h-10 transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg mb-1"
            >
              <button className="flex items-center gap-3 w-full">
                <Moon className="h-5 w-5 shrink-0" />
                <span className="font-medium">Modo Escuro</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Configurações"
              className="h-10 transition-colors text-slate-500 hover:bg-slate-50 hover:text-slate-900 rounded-lg"
            >
              <Link to="#" className="flex items-center gap-3">
                <Settings className="h-5 w-5 shrink-0" />
                <span className="font-medium">Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
