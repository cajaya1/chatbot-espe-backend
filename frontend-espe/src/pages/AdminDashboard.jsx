import { FileText, Users2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { procesoService, userService } from '../services/api'
import useAuth from '../hooks/useAuth'

function AdminDashboard() {
  const { user } = useAuth()
  const displayName = user?.full_name || user?.username || 'Usuario'
  const [procesosSoportados, setProcesosSoportados] = useState(null)
  const [usuariosRegistrados, setUsuariosRegistrados] = useState(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [procesos, usuarios] = await Promise.all([
          procesoService.listProcesos(),
          userService.listUsers(),
        ])

        setProcesosSoportados(procesos.length)
        setUsuariosRegistrados(usuarios.length)
      } catch {
        setProcesosSoportados(0)
        setUsuariosRegistrados(0)
      }
    }

    fetchMetrics()
  }, [])

  const adminMetrics = [
    { label: 'Procesos Soportados', value: procesosSoportados, icon: FileText },
    { label: 'Usuarios Registrados', value: usuariosRegistrados, icon: Users2 },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-4xl px-2">
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Panel de gestión ESPE
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          Vista resumida con datos reales del sistema.
        </p>
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Sesión activa: <span className="text-slate-700">{displayName}</span>
        </p>
      </div>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-8">
        {/* Métricas */}
        <div className="grid gap-4 md:grid-cols-2">
          {adminMetrics.map((metric) => {
            const Icon = metric.icon

            return (
              <article key={metric.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 shadow-sm transition hover:bg-white hover:border-sky-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">{metric.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">
                      {metric.value === null ? '—' : metric.value}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <p className="text-sm text-slate-500">Los contadores se alimentan desde los listados vigentes de procesos y usuarios.</p>
      </section>
    </div>
  )
}

export default AdminDashboard
