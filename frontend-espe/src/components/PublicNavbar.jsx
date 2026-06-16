import { useState } from 'react'
import { Menu, X, User } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useChat } from '../context/ChatContext'
import LogoEspe from '../assets/LogoEspe.png'
import LogoIti from '../assets/LogoITI.png'

const publicLinks = [
  { label: 'Inicio', path: '/' },
  { label: 'Formatos', path: '/formatos-anexos' },
]

function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { openChat } = useChat()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-4 sm:px-6 lg:px-8 xl:px-10">
        <Link to="/" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm transition hover:shadow-md">
          <img src={LogoEspe} alt="Logo ESPE" className="h-11 w-auto object-contain sm:h-12" />
        </Link>

        <div className="hidden lg:flex flex-1 items-center justify-center">
          <span className="h-px w-full max-w-40 bg-slate-200" />
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {publicLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                [
                  'rounded-full px-4 py-2 text-sm font-medium transition',
                  isActive
                    ? 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                ].join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
          

          <Link
            to="/admin/login"
            className="ml-2 rounded-full p-2 text-slate-600 transition hover:bg-slate-100 hover:text-sky-700"
            title="Inicio de sesión"
          >
            <User className="h-5 w-5" />
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
          onClick={() => setMobileOpen((current) => !current)}
          aria-label="Abrir navegación"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="hidden rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm lg:flex">
          <img src={LogoIti} alt="Logo TI en Línea" className="h-11 w-auto object-contain sm:h-12" />
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 sm:px-6 lg:px-8">
            {publicLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  [
                    'rounded-2xl px-4 py-3.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-sky-700 text-white'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
            
            <button
              onClick={() => {
                setMobileOpen(false);
                openChat();
              }}
              className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Asistente
            </button>

            <Link
              to="/admin/login"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            >
              <User className="h-5 w-5" />
              <span>Inicio de sesión</span>
            </Link>
          </div>
        </div>
      ) : null}

    </header>
  )
}

export default PublicNavbar