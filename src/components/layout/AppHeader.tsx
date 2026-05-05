import { Bell, Search, Menu, LogOut, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSearch } from '@/contexts/search-context'
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
  const userRole = profile?.role || 'vendedor'

  return (
    <header className="flex h-16 w-full items-center justify-between bg-card px-4 border-b border-border shrink-0 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="relative w-full max-w-md hidden sm:flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar registros, contatos ou leads..."
            className="w-full bg-muted/50 pl-9 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card"></span>
        </Button>
        <div className="h-6 w-px bg-border mx-1"></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-muted h-10">
              <Avatar className="h-7 w-7 rounded-md">
                <AvatarImage
                  src={`https://img.usecurling.com/ppl/thumbnail?seed=${session?.user?.id}`}
                />
                <AvatarFallback className="rounded-md bg-primary/10 text-primary text-xs">
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-sm">
                <span className="font-medium leading-none text-foreground">{userName}</span>
                <span className="text-[11px] text-muted-foreground mt-1 capitalize">
                  {userRole}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" /> Perfil
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
