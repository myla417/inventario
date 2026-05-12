import { useState } from "react"
import Sidebar from "./Sidebar"
import TopBar from "./Topbar"
import { Navigate, Outlet } from "react-router-dom"
import type { MenuItem } from "@/interfaces/view/MenuItem"
import { useAuth } from "./auth/AuthContext"

interface LayoutProps {
  onLogout: () => void
  redirect: (page: string) => void
  menuItems: MenuItem[]
  name: string
  role: string
}

export default function Layout({ onLogout, redirect, menuItems, name, role }: LayoutProps) {
  const [currentPage, setCurrentPage] = useState("/dashboard")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pageLabel = menuItems.find(x => x.id === currentPage)?.label || "Inicio"
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const handlePageChange = (page: string) => {
    setCurrentPage(page)
    redirect(page)
    setSidebarOpen(false)
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Sidebar - always visible on desktop, overlay on mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar currentPage={currentPage} onPageChange={handlePageChange} menuItems={menuItems} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar
          currentPage={pageLabel}
          onLogout={onLogout}
          onPageChange={handlePageChange}
          name={name}
          role={role}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}