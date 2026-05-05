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
  Briefcase,
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

const navItems = [
  { title: 'Dashboard', path: '/', icon: LayoutDashboard },
  { title: 'Leads', path: '/leads', icon: Users },
  { title: 'Pipeline', path: '/pipeline', icon: Kanban },
  { title: 'Atividades', path: '#', icon: Calendar },
  { title: 'Tarefas', path: '/tasks', icon: CheckSquare },
  { title: 'Propostas', path: '/proposals', icon: FileText },
  { title: 'Relatórios', path: '#', icon: BarChart },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border">
        <div className="flex items-center gap-3 font-bold text-lg px-4 w-full">
          <Briefcase className="h-6 w-6 text-sidebar-primary shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden truncate">CRM Enterprise</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.title}
                    className="h-10"
                  ></SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="Configurações"
              className="h-10 text-sidebar-foreground hover:bg-sidebar-accent"
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
