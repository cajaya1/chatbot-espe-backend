import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Edit3, Eye, Plus, Trash2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  deleteAcademicCalendar,
  formatAcademicPeriodLabel,
  isPastAcademicCalendar,
  loadAcademicCalendars,
} from '../utils/academicCalendarStore'

const formatDate = (value) => {
  if (!value) return 'Sin fecha'
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function AdminAcademicCalendarHistory() {
  const navigate = useNavigate()
  const [calendars, setCalendars] = useState([])

  useEffect(() => {
    setCalendars(loadAcademicCalendars())
  }, [])

  const sortedCalendars = useMemo(
    () => [...calendars].sort((left, right) => right.fecha_fin_periodo.localeCompare(left.fecha_fin_periodo)),
    [calendars]
  )

  const refreshCalendars = () => {
    setCalendars(loadAcademicCalendars())
  }

  const handleDelete = (calendar) => {
    if (isPastAcademicCalendar(calendar.fecha_fin_periodo)) return

    const confirmed = window.confirm(`¿Eliminar el periodo ${calendar.nombre_periodo}?`)
    if (!confirmed) return

    deleteAcademicCalendar(calendar.id)
    refreshCalendars()
    toast.success('Periodo eliminado correctamente')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sky-700">
            <CalendarDays className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-[0.3em]">Calendario Académico</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Historial de periodos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Consulta los periodos registrados, revisa sus actividades y gestiona la edición solo cuando el periodo siga vigente.
          </p>
        </div>

        <Link
          to="/admin/calendar/new"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800"
        >
          <Plus className="h-4 w-4" />
          Nuevo periodo
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Periodo</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Fecha fin</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Actividades</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Estado</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {sortedCalendars.map((calendar) => {
                const isPast = isPastAcademicCalendar(calendar.fecha_fin_periodo)
                return (
                  <tr key={calendar.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-5 align-top">
                      <div className="font-semibold text-slate-900">{formatAcademicPeriodLabel(calendar)}</div>
                      <div className="mt-1 text-xs text-slate-500">{calendar.nombre_periodo}</div>
                    </td>
                    <td className="px-6 py-5 align-top text-sm text-slate-700">{formatDate(calendar.fecha_fin_periodo)}</td>
                    <td className="px-6 py-5 align-top text-sm text-slate-700">{calendar.actividades?.length || 0} actividades</td>
                    <td className="px-6 py-5 align-top">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          isPast ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {isPast ? 'Pasado, solo visualización' : 'Vigente'}
                      </span>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          to={`/admin/calendar/${calendar.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalles
                        </Link>
                        {!isPast ? (
                          <>
                            <Link
                              to={`/admin/calendar/${calendar.id}/edit`}
                              className="inline-flex items-center gap-2 rounded-xl border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-50"
                            >
                              <Edit3 className="h-4 w-4" />
                              Editar
                            </Link>
                            <button
                              onClick={() => handleDelete(calendar)}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!sortedCalendars.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-500">
                    No hay periodos registrados todavía.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminAcademicCalendarHistory
