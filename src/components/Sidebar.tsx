import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MenuItem } from "@/interfaces/view/MenuItem"

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  menuItems: MenuItem[]
}

export default function Sidebar({ currentPage, onPageChange, menuItems }: SidebarProps) {
  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      <div className="border-b border-border px-4 py-2">
        <div className="flex items-center justify-between py-0.5">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <span className="text-black font-bold text-sm">C</span>
            </div>
            <div>
              <h2 className="font-bold text-foreground text-sm">Concreto</h2>
              <p className="text-xs text-muted-foreground">Sistema de Gestión</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                  !isActive && "text-muted-foreground hover:text-foreground hover:bg-accent",
                )}
                onClick={() => onPageChange(item.id)}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Button>
            )
          })}
        </div>
      </nav>

      <div className="p-3 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          <p>Concreto v1.0</p>
          <p>© 2026</p>
        </div>
      </div>
    </div>
  )
}