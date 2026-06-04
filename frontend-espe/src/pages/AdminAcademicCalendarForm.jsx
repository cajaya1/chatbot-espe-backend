import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Edit3, FileSpreadsheet, Plus, Save, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  createEmptyCalendar,
  getAcademicCalendarById,
  isPastAcademicCalendar,
  mapImportedCalendarRows,
  normalizeImportedDate,
  upsertAcademicCalendar,
} from '../utils/academicCalendarStore'

const createRow = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  actividad: '',
  fecha: '',
})

const cloneActivities = (activities = []) => {
  if (!activities.length) {
    return [createRow()]
  }

  return activities.map((activity) => ({
    id: activity.id || createRow().id,
    actividad: activity.actividad || '',
    fecha: activity.fecha || '',
  }))
}

function AdminAcademicCalendarForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { periodId } = useParams()
  const fileInputRef = useRef(null)

  const mode = useMemo(() => {
    if (location.pathname.endsWith('/new')) return 'create'
    if (location.pathname.includes('/edit')) return 'edit'
    return 'view'
  }, [location.pathname])

  const [loading, setLoading] = useState(true)
  const [calendar, setCalendar] = useState(createEmptyCalendar())

  useEffect(() => {
    if (mode === 'create') {
      setCalendar(createEmptyCalendar())
      setLoading(false)
      return
    }

    const existing = getAcademicCalendarById(periodId)
    if (!existing) {
      toast.error('Periodo no encontrado')
      navigate('/admin/calendar', { replace: true })
      return
    }

    setCalendar({
      ...existing,
      actividades: cloneActivities(existing.actividades),
    })
    setLoading(false)
  }, [mode, navigate, periodId])

  const isReadOnly = mode === 'view' || (mode === 'edit' && isPastAcademicCalendar(calendar.fecha_fin_periodo))

  const updateField = (field, value) => {
    setCalendar((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const updateActivity = (index, field, value) => {
    setCalendar((current) => {
      const nextActivities = current.actividades.map((activity, activityIndex) =>
        activityIndex === index ? { ...activity, [field]: value } : activity
      )

      if (field === 'fecha' && value) {
        const baseDate = index === 0 ? value : nextActivities[0]?.fecha

        if (!baseDate && index !== 0) {
          toast.error('Primero define la fecha de la primera fila.')
          return current
        }

        if (index !== 0 && nextActivities[0]?.fecha && value < nextActivities[0].fecha) {
          toast.error('La fecha no puede ser anterior a la primera fila.')
          return current
        }

        if (index === 0 && value) {
          const adjusted = nextActivities.map((activity, activityIndex) => {
            if (activityIndex === 0 || !activity.fecha) {
              return activity
            }

            return activity.fecha < value ? { ...activity, fecha: '' } : activity
          })

          if (adjusted.some((activity, activityIndex) => activityIndex > 0 && !activity.fecha && nextActivities[activityIndex].fecha)) {
            toast.error('Se limpiaron fechas que eran anteriores a la primera fila.')
          }

          return { ...current, actividades: adjusted }
        }
      }

      return { ...current, actividades: nextActivities }
    })
  }

  const addRow = () => {
    if (isReadOnly) return
    setCalendar((current) => ({
      ...current,
      actividades: [...current.actividades, createRow()],
    }))
  }

  const removeRow = (index) => {
    if (isReadOnly) return

    setCalendar((current) => {
      const nextActivities = current.actividades.filter((_, activityIndex) => activityIndex !== index)
      return {
        ...current,
        actividades: nextActivities.length ? nextActivities : [createRow()],
      }
    })
  }

  const importFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const extension = file.name.split('.').pop()?.toLowerCase()
      let workbook

      if (extension === 'csv') {
        const text = await file.text()
        workbook = XLSX.read(text, { type: 'string' })
      } else {
        const buffer = await file.arrayBuffer()
        workbook = XLSX.read(buffer, { type: 'array' })
      }

      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
      const mappedRows = mapImportedCalendarRows(rows)
      const baseDate = mappedRows[0]?.fecha

      const validatedRows = baseDate
        ? mappedRows.map((activity, index) => {
            if (index === 0 || !activity.fecha) {
              return activity
            }

            return activity.fecha < baseDate ? { ...activity, fecha: '' } : activity
          })
        : mappedRows

      if (!validatedRows.length) {
        toast.error('El archivo no contiene filas utilizables.')
        return
      }

      if (baseDate && validatedRows.some((activity, index) => index > 0 && !activity.fecha && mappedRows[index]?.fecha)) {
        toast.error('Se limpiaron fechas importadas que eran anteriores a la primera fila.')
      }

      setCalendar((current) => ({
        ...current,
        actividades: validatedRows,
      }))
      toast.success('Archivo importado correctamente')
    } catch {
      toast.error('No se pudo leer el archivo seleccionado')
    } finally {
      event.target.value = ''
    }
  }

  const handleSubmit = () => {
    if (isReadOnly) return

    const nombrePeriodo = calendar.nombre_periodo.trim()
    const fechaFin = calendar.fecha_fin_periodo
    const actividades = calendar.actividades
      .map((activity) => ({
        actividad: activity.actividad.trim(),
        fecha: normalizeImportedDate(activity.fecha),
      }))
      .filter((activity) => activity.actividad || activity.fecha)

    if (!nombrePeriodo || !fechaFin) {
      toast.error('Completa el nombre del periodo y la fecha de finalización.')
      return
    }

    if (!actividades.length) {
      toast.error('Agrega al menos una actividad.')
      return
    }

    if (!actividades[0]?.fecha) {
      toast.error('La primera fila debe tener una fecha base.')
      return
    }

    const payload = {
      id: calendar.id || createEmptyCalendar().id,
      nombre_periodo: nombrePeriodo,
      fecha_fin_periodo: fechaFin,
      actividades,
      createdAt: calendar.createdAt,
    }

    upsertAcademicCalendar(payload)
    toast.success(mode === 'create' ? 'Periodo creado correctamente' : 'Periodo actualizado correctamente')
    navigate('/admin/calendar')
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Cargando periodo...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sky-700">
          <CalendarDays className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.3em]">Calendario Académico</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {mode === 'create' ? 'Crear periodo' : mode === 'edit' ? 'Editar periodo' : 'Detalle del periodo'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {isReadOnly
                ? 'Este periodo está cerrado. Solo puedes visualizar la información registrada.'
                : 'Completa los datos generales y administra las actividades académicas del periodo.'}
            </p>
          </div>

          <Link
            to="/admin/calendar"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al historial
          </Link>
        </div>
      </div>

      {isReadOnly ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Periodo pasado detectado por fecha de finalización. Las acciones de edición permanecen bloqueadas.
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Nombre del periodo</span>
            <input
              type="text"
              value={calendar.nombre_periodo}
              onChange={(event) => updateField('nombre_periodo', event.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
              placeholder="Ej. SI-2026"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Fecha de finalización</span>
            <input
              type="date"
              value={calendar.fecha_fin_periodo}
              onChange={(event) => updateField('fecha_fin_periodo', event.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
            />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Actividades del periodo</h2>
            <p className="mt-1 text-sm text-slate-600">La fecha de cada fila no puede ser anterior a la fecha de la primera fila.</p>
          </div>

          {!isReadOnly ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Importar desde CSV/Excel
              </button>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                <Plus className="h-4 w-4" />
                Añadir nueva fila
              </button>
            </div>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={importFile}
          disabled={isReadOnly}
        />

        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Actividad</th>
                  <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Fecha</th>
                  {!isReadOnly ? <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Acción</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {calendar.actividades.map((activity, index) => (
                  <tr key={activity.id} className="align-top hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <input
                        type="text"
                        value={activity.actividad}
                        onChange={(event) => updateActivity(index, 'actividad', event.target.value)}
                        disabled={isReadOnly}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
                        placeholder="Escribe la actividad"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <input
                        type="date"
                        value={activity.fecha}
                        onChange={(event) => updateActivity(index, 'fecha', event.target.value)}
                        disabled={isReadOnly}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
                      />
                    </td>
                    {!isReadOnly ? (
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Quitar
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {!isReadOnly ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800"
            >
              <Save className="h-4 w-4" />
              Guardar periodo
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/calendar')}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        ) : null}

        {mode === 'view' ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={`/admin/calendar/${calendar.id}/edit`}
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 px-5 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
            >
              <Edit3 className="h-4 w-4" />
              Editar periodo
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default AdminAcademicCalendarForm
