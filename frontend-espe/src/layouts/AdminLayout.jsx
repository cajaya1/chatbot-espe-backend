import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import InstitutionalHeader from '../components/InstitutionalHeader'

function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900 overflow-hidden">
      {/* Navbar superior full width */}
      <InstitutionalHeader onMenuClick={() => setSidebarOpen((current) => !current)} />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar lateral (Desktop - Siempre visible en LG+) */}
        <div className="hidden lg:block h-full shrink-0">
          <Sidebar open />
        </div>

        {/* Sidebar móvil (Overlay + Sidebar con animación) */}
        <div 
          className={`fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
            sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setSidebarOpen(false)}
        />
        
        <div className={`fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar open mobile onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 bg-slate-50">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout