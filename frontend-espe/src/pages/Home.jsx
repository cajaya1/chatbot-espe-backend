import { ArrowRight, GraduationCap, BookOpen, Target, Lightbulb, Bot, FileText, LayoutDashboard } from "lucide-react"
import { Link } from "react-router-dom"
import FondoHome from "../assets/fondoHome.jpg"

function Home() {
  return (
    <div className="flex flex-col bg-slate-100 min-h-screen w-full">
      {/* Hero Section */}

      <section className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-cover bg-center px-20 py-12 text-center text-white"
        style={{ backgroundImage: `url(${FondoHome})` }}
      >
        <div className="absolute inset-0 z-0 bg-slate-950/85" />

        <div className="relative z-10 max-w-4xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Plataforma de Asistencia <span className="text-sky-400">Académica</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-slate-200 sm:text-xl">
              Gestión ágil de procesos y consultas reglamentarias para estudiantes de Tecnologías de la Información en Línea (ITIV).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/asistente-virtual"
              className="flex h-12 items-center justify-center rounded-xl bg-sky-600 px-8 text-sm font-bold text-white shadow-lg transition hover:bg-sky-500 hover:scale-105 active:scale-95"
            >
              Consultar Asistente
            </Link>

            <Link
              to="/formatos-anexos"
              className="flex h-12 items-center justify-center rounded-xl bg-white/10 px-8 text-sm font-bold text-white backdrop-blur-md transition hover:bg-white/20 active:scale-95 border border-white/20"
            >
              Anexos
            </Link>
          </div>
        </div>
      </section>
      {/* Main Dashboard Layout */}
      <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

          {/* Left Column: Mission/Vision & Info */}
          <div className="space-y-6 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <LayoutDashboard className="h-6 w-6 text-sky-600" />
                <h2 className="text-base font-bold uppercase tracking-wider text-slate-800">Institucional</h2>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sky-700">
                    <Target className="h-5 w-5" />
                    <h3 className="font-bold text-lg">Misión</h3>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">
                    Formar profesionales líderes en TI con sólidos conocimientos científicos y tecnológicos, capaces de gestionar soluciones innovadoras para el país y la sociedad.
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-6 space-y-3">
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

            <div className="rounded-2xl bg-sky-700 p-8 text-white shadow-lg shadow-sky-200">
              <h3 className="text-lg font-bold">Aviso Estudiantil</h3>
              <p className="mt-3 text-sm text-sky-100">
                Recuerda que todos los procesos deben seguir los plazos establecidos en el Calendario Académico vigente.
              </p>
              <a
                href="https://www.espe.edu.ec/calendario-academico/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 text-sm font-semibold underline underline-offset-4 hover:text-sky-200 hover:text-sky-200"
              >
                Ver calendario académico
              </a>
               
            </div>
          </div>

          {/* Right Column: Services Grid */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              
              {/* Anexos Card */}
              <Link
                to="/formatos-anexos"
                className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-sky-500 hover:shadow-xl hover:shadow-sky-500/10 sm:col-span-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                  <div className="flex items-start gap-6">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Formatos y Anexos</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500 max-w-xl">Descarga las plantillas oficiales y documentos necesarios para tus solicitudes académicas en un solo lugar.</p>
                    </div>
                  </div>
                  <div className="flex h-12 items-center justify-center rounded-xl bg-slate-100 px-8 text-sm font-bold text-slate-700 transition group-hover:bg-sky-600 group-hover:text-white">
                    Ver descargas <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </div>
              </Link>

              {/* Guía de Procesos (Full Width) */}
              <div className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-1 shadow-sm transition-all hover:border-green-500 sm:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                  <div className="flex items-start gap-6">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-700">
                      <GraduationCap className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Guía de Procesos Académicos</h3>
                      <p className="mt-2 text-sm text-slate-500 max-w-xl">Conoce los pasos detallados para realizar tus trámites correctamente dentro de la plataforma y la universidad.</p>
                    </div>
                  </div>
                </div>
                <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-4">
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

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl bg-white p-5 border border-slate-200 shadow-sm">
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