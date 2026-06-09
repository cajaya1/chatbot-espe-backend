import { Mail, PhoneCall, MessageSquare, Send, MessageCircle, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import LogoEspe from '../assets/LogoEspe.png'
import LogoIti from '../assets/LogoITI.png'

function PublicFooter() {
  const currentYear = new Date().getFullYear()
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || 'carrera_itiv@espe.edu.ec'

  return (
    <footer className="border-t border-sky-500/10 bg-[#061c2c] text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-10">
        
        {/* BRANDING HEADER */}
        <div className="mb-12 flex flex-col items-center justify-between gap-6 pb-10 border-b border-white/5 md:flex-row">
          <div className="flex items-center gap-5">
            <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-2xl ring-1 ring-white/10 transition-transform hover:scale-105">
              <img src={LogoEspe} alt="Logo ESPE" className="h-12 w-auto object-contain" />
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">
                Universidad de las Fuerzas Armadas
              </p>
              <h2 className="mt-1.5 flex flex-wrap items-center gap-x-3 text-2xl font-black tracking-tighter text-white sm:text-3xl">
                ESPE 
                <span className="hidden h-6 w-px bg-white/20 sm:block" /> 
                <span className="text-lg font-medium tracking-tight text-sky-100/90 sm:text-xl">
                  Tecnologías de la Información <span className="font-bold text-sky-400">en Línea</span>
                </span>
              </h2>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white p-4 shadow-xl ring-1 ring-white/10 transition-transform hover:scale-105">
            <img src={LogoIti} alt="Logo TI" className="h-12 w-auto object-contain" />
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">

          {/* COL 1: SOBRE LA CARRERA */}
          <section className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-sky-400">
                Carrera ITIV
              </h3>
              <div className="mt-2 h-1 w-8 rounded-full bg-sky-500" />
            </div>
            <p className="text-[15px] leading-relaxed text-sky-100/60">
              Misión: Formar académicos, profesionales e investigadores de excelencia, creativos, humanistas, con capacidad de liderazgo, pensamiento crítico y alta conciencia ciudadana; generar, aplicar y difundir el conocimiento y, proporcionar e implementar alternativas de solución a los problemas del país, acordes con el plan Nacional de Desarrollo.
            </p>
            <p className="text-[15px] leading-relaxed text-sky-100/60">
              Visión: Líder en la gestión del conocimiento y de la tecnología en el Sistema Nacional de Educación Superior, con prestigio Internacional y referente de práctica de valores éticos, cívicos y de servicio a la sociedad.
            </p>
          </section>

          {/* COL 2: ACCESOS RÁPIDOS */}
          <section className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-sky-400">
                Navegación
              </h3>
              <div className="mt-2 h-1 w-8 rounded-full bg-sky-500" />
            </div>
            <nav className="flex flex-col gap-3">
              {[
                { label: 'Inicio', to: '/' },
                { label: 'Procesos Académicos', to: '/procesos-academicos' },
                { label: 'Formatos y Anexos', to: '/formatos-anexos' },
                { label: 'Bot TI en Línea', to: '/asistente-virtual' }
              ].map((link) => (
                <Link
                  key={link.label}
                  to={link.to}
                  className="group flex items-center gap-2 text-[15px] text-sky-100/70 transition-colors hover:text-white"
                >
                  <ChevronRight className="h-4 w-4 text-sky-500 transition-transform group-hover:translate-x-1" />
                  {link.label}
                </Link>
              ))}
            </nav>
          </section>

          {/* COL 3: CONTACTO INSTITUCIONAL */}
          <section className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-sky-400">
                Atención
              </h3>
              <div className="mt-2 h-1 w-8 rounded-full bg-sky-500" />
            </div>
            <div className="space-y-4">
              <a href={`mailto:${supportEmail}`} 
                className="flex items-center gap-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-sky-400/70">Correo</p>
                  <p className="truncate text-sm text-white">{supportEmail}</p>
                </div>
              </a>

              <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/70">Teléfono</p>
                  <p className="text-sm text-white">(02) 3989-400</p>
                </div>
              </div>
            </div>
          </section>

          {/* COL 4: CANALES DIGITALES */}
          <section className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-sky-400">
                Comunidad Digital
              </h3>
              <div className="mt-2 h-1 w-8 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-3">
              <a
                href="https://t.me/itiv_espe_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-600/20 to-sky-400/10 p-4 ring-1 ring-sky-400/20 transition hover:from-sky-600/30 hover:ring-sky-400/50 block"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-900/40 transition group-hover:bg-sky-400">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">Telegram TI</p>
                    <p className="text-[11px] text-sky-300 font-medium">@itiv_espe_bot</p>
                  </div>
                </div>
              </a>

              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600/20 to-emerald-400/10 p-4 ring-1 ring-emerald-400/20 transition hover:from-emerald-600/30">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-900/40">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white uppercase tracking-tight">WhatsApp TI</p>
                    <p className="text-[11px] text-emerald-300 font-medium">Próximamente</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* BOTTOM COPYRIGHT */}
        <div className="mt-16 border-t border-white/5 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-[12px] font-medium text-sky-100/40">
              © {currentYear} Universidad de las Fuerzas Armadas ESPE. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400/60">
              <span>Carrera ITIV</span>
              <span className="text-white/10">|</span>
              <span>Sangolquí, Ecuador</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  )
}

export default PublicFooter