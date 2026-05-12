import { Button } from "@/components/ui/button"
import { User, LogOut, Settings, Menu } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface TopBarProps {
  currentPage: string
  onLogout: () => void
  onPageChange: (page: string) => void
  name: string
  role: string
  onMenuToggle: () => void
}

export default function TopBar({ currentPage, onLogout, onPageChange, name, role, onMenuToggle }: TopBarProps) {
  return (
    <header className="bg-card border-b border-border px-4 md:px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{currentPage}</h1>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="bg-primary p-1.5 rounded-full">
                  <User className="h-4 w-4 text-black" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-foreground">{name || 'Usuario'}</p>
                  <p className="text-xs text-muted-foreground">{role === 'admin' ? 'Administrador' : 'Cajero'}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {role === 'admin' && (
                <DropdownMenuItem onClick={() => onPageChange('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configuración
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-secondary">
                <LogOut className="mr-2 h-4 w-4" />
                Salir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}