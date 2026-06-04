import { FileText, PlusCircle, Trash2, Users2 } from 'lucide-react'
import useAuth from '../hooks/useAuth'

const adminMetrics = [
  { label: 'PDF cargados', value: '24', icon: FileText },
  { label: 'Documentos activos', value: '18', icon: Users2 },
  { label: 'Nuevas cargas', value: '07', icon: PlusCircle },
  { label: 'En revisión', value: '03', icon: Trash2 },
]

function AdminDashboard() {
  const { user } = useAuth()
  const displayName = user?.full_name || user?.username || 'Usuario'

  return (
    <div className="flex flex-col gap-8">
      {/* Header Global del Panel - Ahora solo en Dashboard */}
      <div className="max-w-4xl px-2">
       {/* <p className="text-sm font-bold uppercase tracking-[0.4em] text-sky-700">
          Área administrativa
        </p> */}
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Panel de gestión documental ESPE
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Espacio centralizado para la carga de PDFs, organización de procesos y administración de usuarios del sistema TI.
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Sesión activa: <span className="text-slate-700">{displayName}</span>
        </p>
      </div>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-8">
        {/* Métricas */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminMetrics.map((metric) => {
            const Icon = metric.icon

            return (
              <article key={metric.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:bg-white hover:border-sky-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{metric.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{metric.value}</p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {/* Paneles de Control */}
        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="flex flex-col justify-center rounded-[2rem] border border-slate-100 bg-slate-50/50 p-8">
            <h3 className="text-xl font-bold text-slate-900">Estado del Repositorio</h3>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Bienvenido al panel operativo. Aquí puedes monitorear la integridad de los documentos indexados para el Asistente Virtual y gestionar los accesos institucionales.
            </p>
            <div className="mt-6 flex gap-4">
              <button className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800">Ver Reportes</button>
              <button className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50">Auditoría</button>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">Acciones rápidas</p>
            <div className="mt-6 space-y-3 text-sm text-slate-200">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-sky-400"></div>
                Subir documentos PDF
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-sky-400"></div>
                Eliminar archivos obsoletos
              </div>
              {/*<div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="h-2 w-2 rounded-full bg-sky-400"></div>
                Publicar anexos y formatos
              </div>*/}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
