import { Menu, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import LogoEspe from '../assets/LogoEspe.png'
import LogoIti from '../assets/LogoITI.png'
import useAuth from '../hooks/useAuth'

function InstitutionalHeader({ onMenuClick }) {
  const { user } = useAuth()
  const displayName = user?.full_name || user?.username || 'Usuario'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/70 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">

        {/* Lado Izquierdo: Menú y Logo Principal (ESPE) */}
        <div className="flex items-center gap-5">
          <button
            onClick={onMenuClick}
            className="group inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:border-sky-300 hover:bg-sky-50 active:scale-95 lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu className="h-6 w-6 text-slate-600 transition-colors group-hover:text-sky-600" />
          </button>
          
          <Link
            to="/"
            className="relative flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm transition-transform hover:scale-105"
            aria-label="Ir al inicio"
          >
            <img src={LogoEspe} alt="Logo ESPE" className="h-10 w-auto object-contain" />
            <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
          </Link>
        </div>

        {/* Lado Derecho: Usuario y Logo Secundario (TI) */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm sm:flex">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-700 uppercase">{displayName}</p>
              <p className="truncate text-[10px] text-slate-400">
                {user?.role === 'admin' ? 'Administrador' : 'Usuario'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <img src={LogoIti} alt="Logo TI" className="h-10 w-auto object-contain" />
          </div>
        </div>
      </div>
    </header>
  )
}

export default InstitutionalHeader
