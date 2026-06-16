import useAuth from '../hooks/useAuth'
import { User, Shield, Mail, BadgeCheck, LogOut, Camera } from 'lucide-react'

function Profile() {
  const { user, logout } = useAuth()
  const displayName = user?.full_name || user?.username || 'Usuario'
  const roleLabel = user?.role === 'admin' ? 'Administrador' : 'Usuario'

  const details = [
    { label: 'Usuario', value: displayName, icon: User, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Rol', value: roleLabel, icon: Shield, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Correo', value: user?.email || 'No registrado', icon: Mail, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Estado', value: user?.is_active === false ? 'Inactivo' : 'Activo', icon: BadgeCheck, color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <section className="mx-auto max-w-4xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600/20 to-transparent" />
        <div className="relative flex flex-col items-center gap-6 px-8 py-12 text-center md:flex-row md:text-left">
          <div className="relative">
            <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/10 bg-white/5 text-4xl font-bold text-white backdrop-blur-md">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <button className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg transition hover:bg-sky-600 active:scale-95">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 space-y-2">
            <h1 className="text-3xl font-bold text-white">{displayName}</h1>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-200 backdrop-blur-sm">
              <div className="h-2 w-2 rounded-full bg-sky-400" />
              {roleLabel}
            </div>
          </div>
          
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {details.map((item) => (
          <article 
            key={item.label} 
            className="group relative flex items-center gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
          >
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${item.bg} ${item.color} transition-transform group-hover:scale-110`}>
              <item.icon className="h-7 w-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
              <p className="mt-1 text-base font-bold text-slate-900">{item.value}</p>
            </div>
          </article>
        ))}
      </div>

      {/* Security Tip */}
      <div className="rounded-[2rem] bg-sky-50 p-8 border border-sky-100">
        <div className="flex items-center gap-3 text-sky-700">
          <Shield className="h-5 w-5" />
          <h3 className="font-bold text-sm">Privacidad y Seguridad</h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-sky-600/80">
          Tus datos institucionales son gestionados bajo las normativas de la ESPE. 
          Asegúrate de no compartir tus credenciales de acceso con terceros para mantener la integridad académica.
        </p>
      </div>
    </section>
  )
}

export default Profile
