import { ArrowLeft, Mail, Lock, LogIn, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import FondoHome from '../assets/fondoHome.jpg'
import LogoEspe from '../assets/LogoEspe.png'
import useAuth from '../hooks/useAuth'

function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'soporte@espe.edu.ec'

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password) return
    setLoading(true)
    try {
      const user = await login(username.trim(), password)
      toast.success(`Bienvenido/a ${user.full_name || user.username}`)
      navigate('/admin/dashboard')
    } catch (error) {
      const message = error.response?.data?.detail || 'No se pudo iniciar sesión'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-900 px-4 py-12 sm:px-6">

      {/* Imagen de fondo a pantalla completa */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${FondoHome})` }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-slate-950/95 via-slate-900/85 to-sky-900/60" />

      {/* Botón de Regreso Flotante */}
      <Link
        to="/"
        className="absolute left-6 top-6 z-30 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white border border-white/20 shadow-sm backdrop-blur-md transition hover:bg-white/20"
      >
        <ArrowLeft className="h-4 w-4" />
        Regresar al inicio
      </Link>

      {/* Logo ESPE superior */}
      <div className="absolute right-6 top-6 z-30">
        <img src={LogoEspe} alt="ESPE Logo" className="h-12 w-auto brightness-0 invert opacity-90 sm:h-14" />
      </div>

      {/* Formulario de Admin (centrado) */}
      <div className="relative z-20 w-full max-w-sm space-y-8">

        {/* Header del Formulario */}
        <div className="text-center">
          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl shadow-slate-900/40 text-slate-900">
              <Settings className="h-8 w-8" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Inicio de Sesión
          </h1>
          <p className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Solo personal autorizado
          </p>
        </div>

        {/* Card del Formulario */}
        <div className="rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-950/40 border border-slate-100">
            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Usuario</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-sky-600 transition-colors">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      placeholder="usuario"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Contraseña</label>
                    <a
                      href={`mailto:${supportEmail}?subject=Recuperación%20de%20contraseña`}
                      className="text-[10px] font-bold uppercase tracking-widest text-sky-600 hover:text-sky-700 transition"
                    >
                      Recuperar contraseña
                    </a>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-sky-600 transition-colors">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white shadow-xl shadow-slate-300 transition-all hover:bg-slate-800 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <LogIn className="h-5 w-5" />
                Iniciar Sesión
              </button>
            </form>

            <div className="mt-6 text-center">
              <a
                href={`mailto:${supportEmail}?subject=Soporte%20de%20acceso`}
                className="text-[11px] font-bold uppercase tracking-widest text-sky-600 hover:text-sky-700 transition"
              >
                ¿Problemas con el acceso? Contactar a Administración
              </a>
            </div>
          </div>

          <div className="text-center mt-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-red-600 border border-red-100">
              Uso monitoreado por seguridad institucional
            </div>
          </div>
        </div>
    </div>
  )
}

export default Login
