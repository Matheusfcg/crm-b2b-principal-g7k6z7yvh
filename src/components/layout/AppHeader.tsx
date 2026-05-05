import { Bell, Search, Mail, CloudLightning, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSearch } from '@/contexts/search-context'
import { useAuth } from '@/hooks/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function AppHeader() {
  const { searchQuery, setSearchQuery } = useSearch()
  const { session, signOut } = useAuth()
  const userName = session?.user?.user_metadata?.name || 'Usuário'

  return (
    <header className="flex h-16 w-full items-center justify-between rounded-full bg-white px-6 shadow-sm shrink-0 border border-gray-100">
      <div className="flex items-center gap-8 flex-1">
        <div className="flex items-center gap-2 font-bold text-lg text-black cursor-pointer">
          <div className="bg-black text-white p-1.5 rounded-full">
            <CloudLightning className="h-5 w-5 fill-current" />
          </div>
          <span className="hidden sm:inline-block">Salesforce</span>
        </div>
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-500">
          <a href="#" className="text-blue-600 font-semibold border-b-2 border-blue-600 py-5">
            Resumo
          </a>
          <a href="#" className="hover:text-gray-900 transition-colors py-5">
            Fundadores
          </a>
          <a href="#" className="hover:text-gray-900 transition-colors py-5">
            Finanças
          </a>
          <a href="#" className="hover:text-gray-900 transition-colors py-5">
            Contatos
          </a>
          <a href="#" className="hover:text-gray-900 transition-colors py-5">
            Crescimento
          </a>
          <a href="#" className="hover:text-gray-900 transition-colors py-5">
            Projetos
          </a>
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative w-full max-w-[160px] xl:max-w-xs hidden md:flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="w-full bg-gray-50 pl-9 border-none rounded-full h-10 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 rounded-full hover:bg-gray-50 hover:text-gray-900"
          >
            <Mail className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 rounded-full hover:bg-gray-50 hover:text-gray-900 relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
          </Button>
        </div>
        <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-bold leading-none text-gray-900">{userName}</span>
                <span className="text-xs text-gray-500 mt-1 hover:text-red-500 transition-colors">
                  Sair da conta
                </span>
              </div>
              <Avatar className="h-10 w-10 border-2 border-white shadow-sm hover:scale-105 transition-transform">
                <AvatarImage
                  src={`https://img.usecurling.com/ppl/thumbnail?seed=${session?.user?.id}`}
                  alt={userName}
                />
                <AvatarFallback>{userName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => signOut()}
              className="text-red-600 focus:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
