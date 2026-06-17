import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight, BookOpen, CalendarDays, ChevronLeft, ChevronRight, FileText, GraduationCap, LayoutDashboard, Lightbulb, Mail, MessageCircle, PhoneCall, Send, Target } from "lucide-react"
import { Link } from "react-router-dom"
import FondoHome from "../assets/fondoHome.jpg"
import { configService } from "../services/api"

// Calendario académico oficial de la ESPE.
const CALENDARIO_URL = "https://www.espe.edu.ec/calendario-academico/"
// Telegram oficial de la carrera (mismo que el footer).
const TELEGRAM_URL = "https://t.me/itiv_espe_bot"

// Paleta de acentos por slide para diferenciar visualmente cada banner.
const accents = {
  sky: { text: "text-sky-300", btn: "bg-sky-600 hover:bg-sky-500", dot: "bg-sky-400", glow: "from-sky-500/30" },
  indigo: { text: "text-indigo-300", btn: "bg-indigo-600 hover:bg-indigo-500", dot: "bg-indigo-400", glow: "from-indigo-500/30" },
  emerald: { text: "text-emerald-300", btn: "bg-emerald-600 hover:bg-emerald-500", dot: "bg-emerald-400", glow: "from-emerald-500/30" },
  cyan: { text: "text-cyan-300", btn: "bg-cyan-600 hover:bg-cyan-500", dot: "bg-cyan-400", glow: "from-cyan-500/30" },
  amber: { text: "text-amber-300", btn: "bg-amber-600 hover:bg-amber-500", dot: "bg-amber-400", glow: "from-amber-500/30" },
  violet: { text: "text-violet-300", btn: "bg-violet-600 hover:bg-violet-500", dot: "bg-violet-400", glow: "from-violet-500/30" },
}

// Slides del carrusel principal del hero.
const slides = [
  {
    id: "bienvenida",
    type: "plain",
    eyebrow: "Bienvenido",
    title: "Plataforma de Asistencia Académica",
    description: "Gestión ágil de procesos y consultas reglamentarias para estudiantes de Tecnologías de la Información en Línea (ITIV).",
    icon: LayoutDashboard,
    accent: "sky",
  },
  {
    id: "formatos",
    type: "link",
    eyebrow: "Descargas",
    title: "Formatos y Anexos",
    description: "Descarga las plantillas oficiales y documentos necesarios para tus solicitudes académicas en un solo lugar.",
    cta: "Ver descargas",
    to: "/formatos-anexos",
    icon: FileText,
    accent: "indigo",
  },
  {
    id: "calendario",
    type: "external",
    eyebrow: "Calendario",
    title: "Calendario Académico",
    description: "Consulta las fechas oficiales de los procesos y actividades del período académico vigente.",
    cta: "Ver calendario",
    href: CALENDARIO_URL,
    icon: CalendarDays,
    accent: "amber",
  },
  {
    id: "chat",
    type: "chat",
    eyebrow: "Asistencia",
    title: "Chatea con Nosotros",
    description: "Resuelve tus dudas al instante a través de nuestros canales de mensajería directa.",
    icon: Send,
    accent: "emerald",
  },
  {
    id: "atencion",
    type: "contact",
    eyebrow: "Atención",
    title: "Canales de Atención",
    description: "Comunícate con la coordinación de la carrera por los medios oficiales.",
    icon: Mail,
    accent: "cyan",
  },
  {
    id: "institucional",
    type: "mision",
    eyebrow: "Institucional",
    title: "Misión y Visión",
    description: "Conoce el compromiso y la proyección de la carrera de Tecnologías de la Información en Línea.",
    cta: "Ver Misión y Visión",
    icon: Target,
    accent: "violet",
  },
]

function Home() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)
  const [supportEmail, setSupportEmail] = useState(
    import.meta.env.VITE_SUPPORT_EMAIL || "carrera_itiv@espe.edu.ec"
  )
  const [supportPhone, setSupportPhone] = useState("(02) 3989-400")
  const trackRef = useRef(null)
  const slideRefs = useRef([])

  useEffect(() => {
    configService.getCorreoSoporte().then((d) => setSupportEmail(d.correo)).catch(() => {})
    configService.getTelefonoSoporte().then((d) => setSupportPhone(d.telefono)).catch(() => {})
  }, [])

  // Desplaza SOLO el carrusel en horizontal (no usa scrollIntoView para no
  // arrastrar la página de vuelta al hero cuando el usuario ya bajó la vista).
  const scrollToIndex = useCallback((index) => {
    const total = slides.length
    const next = ((index % total) + total) % total
    setCurrent(next)
    const track = trackRef.current
    const elemento = slideRefs.current[next]
    if (track && elemento) {
      track.scrollTo({ left: elemento.offsetLeft, behavior: "smooth" })
    }
  }, [])

  // Mantiene los indicadores sincronizados cuando el usuario desplaza a mano.
  const handleScroll = () => {
    const track = trackRef.current
    if (!track) return
    const center = track.scrollLeft + track.clientWidth / 2
    let closest = 0
    let min = Infinity
    slideRefs.current.forEach((el, i) => {
      if (!el) return
      const elCenter = el.offsetLeft + el.clientWidth / 2
      const dist = Math.abs(elCenter - center)
      if (dist < min) {
        min = dist
        closest = i
      }
    })
    setCurrent(closest)
  }

  // Desplaza suavemente hasta el panel institucional (Misión y Visión).
  const scrollToMisionVision = () => {
    document.getElementById("mision-vision")?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  // Autoplay: avanza cada 6s salvo que el cursor esté sobre el carrusel.
  useEffect(() => {
    if (paused) return
    const id = setInterval(() => scrollToIndex(current + 1), 6000)
    return () => clearInterval(id)
  }, [current, paused, scrollToIndex])

  return (
    <div className="flex flex-col bg-slate-100 min-h-screen w-full">
      {/* Hero Carrusel — banner con scroll horizontal */}
      <section
        className="relative w-full"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          onScroll={handleScroll}
          className="flex w-full snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
        >
          {slides.map((slide, index) => {
            const Icon = slide.icon
            const accent = accents[slide.accent]
            return (
              <article
                key={slide.id}
                ref={(el) => (slideRefs.current[index] = el)}
                className="relative flex min-h-[80vh] w-full min-w-full snap-center items-center overflow-hidden bg-cover bg-center"
                style={{ backgroundImage: `url(${FondoHome})` }}
              >
                {/* Capas de oscurecimiento + acento de color */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/50" />
                <div className={`absolute inset-0 bg-gradient-to-tr ${accent.glow} to-transparent`} />

                <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 sm:px-10 lg:px-16">
                  <div className="max-w-2xl space-y-6 text-white">
                    <div className={`inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${accent.text} ring-1 ring-white/15 backdrop-blur`}>
                      <Icon className="h-4 w-4" />
                      {slide.eyebrow}
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                      {slide.title}
                    </h1>
                    <p className="max-w-xl text-lg text-slate-200 sm:text-xl">
                      {slide.description}
                    </p>

                    {/* Acciones según el tipo de slide */}
                    <div className="pt-2">
                      {slide.type === "link" && (
                        <Link
                          to={slide.to}
                          className={`inline-flex h-12 items-center justify-center rounded-xl px-8 text-sm font-bold text-white shadow-lg transition hover:scale-105 active:scale-95 ${accent.btn}`}
                        >
                          {slide.cta}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      )}

                      {slide.type === "external" && (
                        <a
                          href={slide.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex h-12 items-center justify-center rounded-xl px-8 text-sm font-bold text-white shadow-lg transition hover:scale-105 active:scale-95 ${accent.btn}`}
                        >
                          {slide.cta}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                      )}

                      {slide.type === "chat" && (
                        <div className="flex flex-wrap gap-4">
                          <a
                            href={TELEGRAM_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-12 items-center justify-center rounded-xl bg-sky-600 px-8 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-sky-500 active:scale-95"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Telegram
                          </a>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent("Hola, necesito información sobre la carrera ITIV")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-8 text-sm font-bold text-white shadow-lg transition hover:scale-105 hover:bg-emerald-500 active:scale-95"
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            WhatsApp
                          </a>
                        </div>
                      )}

                      {slide.type === "contact" && (
                        <div className="flex flex-wrap gap-3">
                          <a
                            href={`mailto:${supportEmail}`}
                            className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300">
                              <Mail className="h-5 w-5" />
                            </span>
                            <span className="text-left">
                              <span className="block text-[11px] font-bold uppercase tracking-wider text-sky-300/80">Correo</span>
                              <span className="block text-sm font-medium text-white">{supportEmail}</span>
                            </span>
                          </a>
                          <a
                            href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`}
                            className="inline-flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15 backdrop-blur transition hover:bg-white/15"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                              <PhoneCall className="h-5 w-5" />
                            </span>
                            <span className="text-left">
                              <span className="block text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">Teléfono</span>
                              <span className="block text-sm font-medium text-white">{supportPhone}</span>
                            </span>
                          </a>
                        </div>
                      )}

                      {slide.type === "mision" && (
                        <button
                          type="button"
                          onClick={scrollToMisionVision}
                          className={`inline-flex h-12 items-center justify-center rounded-xl px-8 text-sm font-bold text-white shadow-lg transition hover:scale-105 active:scale-95 ${accent.btn}`}
                        >
                          {slide.cta}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {/* Flechas de navegación */}
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => scrollToIndex(current - 1)}
          className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-3 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 sm:flex"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => scrollToIndex(current + 1)}
          className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/10 p-3 text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20 sm:flex"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Indicadores (puntos) */}
        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {slides.map((slide, index) => {
            const isActive = index === current
            return (
              <button
                key={slide.id}
                type="button"
                aria-label={`Ir al slide ${index + 1}`}
                onClick={() => scrollToIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  isActive ? `w-8 ${accents[slide.accent].dot}` : "w-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            )
          })}
        </div>
      </section>

      {/* Main Dashboard Layout */}
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">

          {/* Left Column: Misión/Visión & Info */}
          <div className="space-y-3 lg:col-span-4">
            <div id="mision-vision" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <LayoutDashboard className="h-6 w-6 text-sky-600" />
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-800">Institucional</h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sky-700">
                    <Target className="h-5 w-5" />
                    <h3 className="font-bold text-lg">Misión</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Formar profesionales líderes en TI con sólidos conocimientos científicos y tecnológicos, capaces de gestionar soluciones innovadoras para el país y la sociedad.
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <Lightbulb className="h-5 w-5" />
                    <h3 className="font-bold text-lg">Visión</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Ser referentes nacionales e internacionales en la formación de ingenieros en TI íntegros, competitivos y con excelencia académica para el año 2030.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-sky-700 p-6 text-white shadow-lg shadow-sky-200">
              <h3 className="text-lg font-bold">Aviso Estudiantil</h3>
              <p className="mt-2 text-sm text-sky-100">
                Recuerda que todos los procesos deben seguir los plazos establecidos en el Calendario Académico vigente.
              </p>
              <a
                href={CALENDARIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm font-semibold underline underline-offset-4 hover:text-sky-200"
              >
                Ver calendario académico
              </a>
            </div>
          </div>

          {/* Right Column: Services Grid */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">

              {/* Anexos Card */}
              <Link
                to="/formatos-anexos"
                className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-sky-500 hover:shadow-xl hover:shadow-sky-500/10 sm:col-span-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Formatos y Anexos</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500 max-w-xl">Descarga las plantillas oficiales y documentos necesarios para tus solicitudes académicas en un solo lugar.</p>
                    </div>
                  </div>
                  <div className="flex h-10 items-center justify-center rounded-xl bg-slate-100 px-6 text-sm font-bold text-slate-700 transition group-hover:bg-sky-600 group-hover:text-white">
                    Ver descargas <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </Link>

              {/* Guía de Procesos (Full Width) */}
              <div className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-green-500 sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Guía de Procesos Académicos</h3>
                      <p className="mt-1 text-sm text-slate-500 max-w-xl">Conoce los pasos detallados para realizar tus trámites correctamente dentro de la plataforma y la universidad.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-4">
                  {[
                    "Retiro Voluntario",
                    "Homologación",
                    "Reingreso",
                    "Legalización",
                    "Cambio Carrera",
                    "Retiro Fortuito",
                    "Exámenes Atrasados",
                    "Recalificación"
                  ].map((tag) => (
                    <span key={tag} className="flex items-center justify-center rounded-xl bg-slate-50 py-3 px-4 text-center text-[11px] font-bold text-slate-600 border border-slate-100 transition-colors hover:bg-white hover:border-sky-200 hover:text-sky-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bloques estáticos informativos */}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl bg-white p-4 border border-slate-200 shadow-sm">
                <div className="h-3 w-3 rounded-full bg-green-500 shadow-sm shadow-green-200" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Estado Asistente</p>
                  <p className="text-sm font-bold text-slate-700">En línea y activo</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                <BookOpen className="h-5 w-5 text-sky-600" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Anexos y Formatos</p>
                  <p className="text-sm font-bold text-slate-700">8 Formatos Oficiales</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
                <LayoutDashboard className="h-5 w-5 text-sky-600" />
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Ciclo Académico</p>
                  <p className="text-sm font-bold text-slate-700">2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home
