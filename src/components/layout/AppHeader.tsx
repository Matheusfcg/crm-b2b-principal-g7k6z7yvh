import { Bell, Search, Menu, LogOut, User, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSearch } from '@/contexts/search-context'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useSidebar } from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

export function AppHeader() {
  const { searchQuery, setSearchQuery } = useSearch()
  const { session, profile, signOut } = useAuth()
  const { toggleSidebar } = useSidebar()
  const userName = profile?.name || session?.user?.user_metadata?.name || 'Usuário'

  return (
    <header className="flex h-16 w-full items-center justify-between bg-white px-4 border-b border-slate-100 shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)] z-10 relative">
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden text-slate-500"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative w-full max-w-xl hidden sm:flex items-center">
          <Search className="absolute left-4 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Buscar empresas, contatos, leads..."
            className="w-full bg-slate-50 pl-10 border-transparent focus-visible:ring-1 focus-visible:ring-slate-200 focus-visible:bg-white rounded-full text-slate-600 shadow-none h-[42px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500 hover:bg-slate-50 rounded-full h-10 w-10"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white"></span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-500 hover:bg-slate-50 rounded-full h-10 w-10 hidden sm:flex"
        >
          <Mail className="h-5 w-5" />
        </Button>
        <div className="h-6 w-px bg-slate-200 mx-2"></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 px-2 hover:bg-slate-50 h-10 rounded-full"
            >
              <Avatar className="h-8 w-8 rounded-full border border-slate-200">
                <AvatarImage
                  src={`https://img.usecurling.com/ppl/thumbnail?seed=${session?.user?.id}`}
                />
                <AvatarFallback className="rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link to="/profile" className="flex items-center w-full">
                <User className="mr-2 h-4 w-4" /> Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
