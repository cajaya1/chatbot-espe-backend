import { NavLink, useNavigate } from 'react-router-dom'
import {
  BookOpenText,
  ChevronRight,
  CalendarDays,
  FileText,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Settings2,
  Sparkles,
  Users,
  UserRound,
  X,
} from 'lucide-react'
import useAuth from '../hooks/useAuth'

const navigationItems = [
  { label: 'Información General', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Gestión de procesos', path: '/admin/documents', icon: Settings2 },
  { label: 'Calendario Académico', path: '/admin/calendar', icon: CalendarDays },
  { label: 'Usuarios', path: '/admin/users', icon: Users, adminOnly: true },
]

function Sidebar({ open = true, onClose, mobile = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const displayName = user?.full_name || user?.username || 'Usuario'
  const avatar = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  // Filtrar items basado en rol
  const filteredNavigation = navigationItems.filter(item => 
    !item.adminOnly || user?.role === 'admin'
  )

  return (
    <aside
      className={`flex h-full flex-col border-r border-slate-800/80 bg-slate-950 text-slate-100 shadow-2xl shadow-slate-950/40 ${
        mobile
          ? `fixed inset-y-0 left-0 z-50 w-80 transform transition-transform duration-300 ${
              open ? 'translate-x-0' : '-translate-x-full'
            }`
          : 'w-80'
      }`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 px-6 py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 ring-1 ring-sky-400/20">
            <ShieldCheck className="h-6 w-6 text-sky-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400/80 leading-none">Portal Administrativo</p>
            <h1 className="mt-1.5 text-sm font-bold text-white leading-none">Carrera ITIV - ESPE</h1>
          </div>
        </div>

        {mobile && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all hover:bg-white/10 hover:text-white active:scale-90"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col space-y-5 px-6 py-6 overflow-hidden">
       

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
          {filteredNavigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={mobile ? onClose : undefined}
                className={({ isActive }) =>
                  [
                    'group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-sky-500 text-white shadow-lg shadow-sky-950/30 ring-1 ring-sky-300/20'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'bg-white/5 text-slate-400 group-hover:bg-white/10 group-hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    <ChevronRight className={`h-4 w-4 transition ${isActive ? 'opacity-100' : 'opacity-40'}`} />
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Usuario en el Sidebar */}
        <div className="mt-auto pt-4 border-t border-slate-800/40">
          <button 
            onClick={() => navigate('/admin/profile')}
            className="w-full text-left rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 transition-all hover:bg-white/10 hover:ring-sky-500/30 group/user"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-xl bg-sky-500/10 shadow-inner ring-1 ring-sky-500/20 group-hover/user:bg-sky-500/20">
                <div className="flex h-full w-full items-center justify-center text-sky-400 font-black text-sm">
                  {avatar || 'US'}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white uppercase tracking-tight group-hover/user:text-sky-400 transition-colors">
                  {displayName}
                </p>
                <p className="truncate text-[10px] font-medium text-slate-400 uppercase">
                  Rol: {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                </p>
              </div>
              <UserRound className="h-4 w-4 text-slate-500 group-hover/user:text-sky-400 transition-colors" />
            </div>
          </button>
        </div>
      </div>

      <div className="border-t border-slate-800/80 px-6 py-5">
      
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl bg-red-600/20 px-4 py-3 text-sm font-medium text-red-400 transition-all duration-200 hover:bg-red-600/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20">
            <LogOut className="h-5 w-5" />
          </div>
          <span className="flex-1 text-left font-bold uppercase tracking-wider">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
