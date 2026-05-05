import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Kanban,
  Calendar,
  CheckSquare,
  FileText,
  BarChart,
  CloudLightning,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

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
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2 text-primary font-bold text-xl">
          <CloudLightning className="h-6 w-6 fill-current" />
          <span>Skip CRM</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mt-4">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link to={item.path} className="flex items-center gap-3 py-2">
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
