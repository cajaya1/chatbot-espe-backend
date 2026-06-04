import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  createEmptyActivity,
  createEmptyPeriod,
  enforceMinimumDate,
  formatAcademicDate,
  getAcademicPeriod,
  isPastAcademicPeriod,
  parseSpreadsheetFile,
  saveAcademicPeriod,
} from '../services/academicCalendarService'

const emptyErrorState = {}

function AcademicCalendarScreen({ readOnly = false }) {
  const { calendarId } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const isEditMode = Boolean(calendarId) && !readOnly
  const isCreateMode = !calendarId && !readOnly

  const [loading, setLoading] = useState(Boolean(calendarId))
  const [saving, setSaving] = useState(false)
  const [period, setPeriod] = useState(createEmptyPeriod())
  const [activities, setActivities] = useState([createEmptyActivity()])
  const [rowErrors, setRowErrors] = useState(emptyErrorState)
  const [fileName, setFileName] = useState('')

  useEffect(() => {
    if (!calendarId) {
      setLoading(false)
      setPeriod(createEmptyPeriod())
      setActivities([createEmptyActivity()])
      return
    }

    const current = getAcademicPeriod(calendarId)
    if (!current) {
      toast.error('No se encontró el periodo académico solicitado')
      navigate('/admin/calendar', { replace: true })
      return
    }

    setPeriod({
      nombre_periodo: current.nombre_periodo || '',
      fecha_fin_periodo: current.fecha_fin_periodo || '',
    })
    setActivities((current.actividades && current.actividades.length ? current.actividades : [createEmptyActivity()]).map((item) => ({
      actividad: item.actividad || '',
      fecha: item.fecha || '',
    })))
    setLoading(false)
  }, [calendarId, navigate])

  const lockPastPeriod = useMemo(() => isPastAcademicPeriod(period.fecha_fin_periodo), [period.fecha_fin_periodo])
  const isLocked = readOnly || lockPastPeriod

  const updateActivity = (index, field, value) => {
    setActivities((current) => {
      const next = current.map((item, currentIndex) => ({ ...item }))
      next[index][field] = value

      if (field === 'fecha' && index === 0 && value) {
        return enforceMinimumDate(next)
      }

      if (field === 'fecha' && index > 0 && next[0]?.fecha) {
        const minimum = new Date(`${next[0].fecha}T00:00:00`)
        const currentDate = new Date(`${value}T00:00:00`)

        if (!Number.isNaN(minimum.getTime()) && !Number.isNaN(currentDate.getTime()) && currentDate < minimum) {
          setRowErrors((previous) => ({
            ...previous,
            [index]: 'La fecha no puede ser anterior a la primera fila.',
          }))
          toast.error('La fecha no puede ser anterior a la primera fila')
          next[index].fecha = ''
          return next
        }
      }

      setRowErrors((previous) => {
        const nextErrors = { ...previous }
        delete nextErrors[index]
        return nextErrors
      })

      return next
    })
  }

  const addRow = () => {
    setActivities((current) => [...current, createEmptyActivity()])
  }

  const removeRow = (index) => {
    setActivities((current) => {
      if (current.length === 1) {
        return [createEmptyActivity()]
      }

      return current.filter((_, currentIndex) => currentIndex !== index)
    })

    setRowErrors((previous) => {
      const nextErrors = { ...previous }
      delete nextErrors[index]
      return nextErrors
    })
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imported = await parseSpreadsheetFile(file)
      if (!imported.length) {
        toast.error('El archivo no contiene filas válidas para importar')
        return
      }

      const normalized = enforceMinimumDate(
        imported.map((row) => ({
          actividad: row.actividad || '',
          fecha: row.fecha || '',
        }))
      )

      setActivities(normalized.length ? normalized : [createEmptyActivity()])
      setRowErrors({})
      setFileName(file.name)
      toast.success('Archivo importado correctamente')
    } catch {
      toast.error('No se pudo importar el archivo seleccionado')
    } finally {
      event.target.value = ''
    }
  }

  const handleSubmit = async () => {
    const nombrePeriodo = period.nombre_periodo.trim()
    const fechaFinPeriodo = period.fecha_fin_periodo.trim()
    const cleanedActivities = activities
      .map((item) => ({
        actividad: item.actividad.trim(),
        fecha: item.fecha.trim(),
      }))
      .filter((item) => item.actividad || item.fecha)

    if (!nombrePeriodo || !fechaFinPeriodo) {
      toast.error('Completa el nombre del periodo y la fecha de finalización')
      return
    }

    if (!cleanedActivities.length) {
      toast.error('Agrega al menos una actividad')
      return
    }

    if (!cleanedActivities[0].fecha) {
      toast.error('La primera fila debe incluir una fecha base')
      return
    }

    const invalidDates = cleanedActivities.some((item, index) => {
      if (index === 0 || !item.fecha) return false

      const firstDate = new Date(`${cleanedActivities[0].fecha}T00:00:00`)
      const currentDate = new Date(`${item.fecha}T00:00:00`)
      return !Number.isNaN(firstDate.getTime()) && !Number.isNaN(currentDate.getTime()) && currentDate < firstDate
    })

    if (invalidDates) {
      toast.error('Corrige las fechas de las actividades antes de guardar')
      return
    }

    setSaving(true)
    try {
      saveAcademicPeriod(
        {
          nombre_periodo: nombrePeriodo,
          fecha_fin_periodo: fechaFinPeriodo,
          actividades: cleanedActivities,
        },
        calendarId || null
      )
      toast.success(calendarId ? 'Periodo actualizado correctamente' : 'Periodo creado correctamente')
      navigate('/admin/calendar')
    } finally {
      setSaving(false)
    }
  }

  const backToList = () => navigate('/admin/calendar')

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-[2rem] border border-slate-200 bg-white p-8">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando periodo académico...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-600">
              Calendario Académico
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {readOnly ? 'Detalle del periodo' : isEditMode ? 'Editar periodo académico' : 'Crear periodo académico'}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              {readOnly
                ? 'Consulta el registro completo del periodo académico.'
                : 'Administra periodos y actividades del calendario institucional.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={backToList}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Volver
            </button>

            {!readOnly && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar periodo
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Nombre del Periodo</span>
            <input
              type="text"
              value={period.nombre_periodo}
              onChange={(event) => setPeriod((current) => ({ ...current, nombre_periodo: event.target.value }))}
              disabled={isLocked}
              placeholder="SI-2026: MARZO - AGOSTO 2026"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Fecha de Finalización</span>
            <input
              type="date"
              value={period.fecha_fin_periodo}
              onChange={(event) => setPeriod((current) => ({ ...current, fecha_fin_periodo: event.target.value }))}
              disabled={isLocked}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
            />
          </label>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Actividades del periodo</h2>
            <p className="mt-1 text-sm text-slate-500">
              La primera fecha actúa como referencia mínima para las filas siguientes.
            </p>
          </div>

          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openFilePicker}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                Importar desde CSV/Excel
              </button>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Añadir nueva fila
              </button>
            </div>
          )}
        </div>

        {fileName ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Archivo cargado: {fileName}
          </div>
        ) : null}

        <input
          ref={fileInputRef}
          type="file"
          accept=",.csv,.xlsx,.xls"
          onChange={handleImport}
          className="hidden"
        />

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Actividad</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Fecha</th>
                {!readOnly && <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activities.map((activity, index) => {
                const minimumDate = activities[0]?.fecha || ''
                const rowError = rowErrors[index]

                return (
                  <tr key={`${index}-${activity.actividad}-${activity.fecha}`} className="align-top">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={activity.actividad}
                        onChange={(event) => updateActivity(index, 'actividad', event.target.value)}
                        disabled={isLocked}
                        placeholder="Actividad académica"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={activity.fecha}
                        min={index > 0 && minimumDate ? minimumDate : undefined}
                        onChange={(event) => updateActivity(index, 'fecha', event.target.value)}
                        disabled={isLocked}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
                      />
                      {rowError ? <p className="mt-2 text-xs font-medium text-red-600">{rowError}</p> : null}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Vista previa del periodo</h2>
            <p className="mt-1 text-sm text-slate-500">Resume el calendario antes de guardar o revisar.</p>
          </div>

          {!readOnly && isLocked ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Eye className="h-3.5 w-3.5" />
              Periodo pasado, solo lectura
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Periodo</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{period.nombre_periodo || 'Sin nombre'}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Fin del periodo</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {period.fecha_fin_periodo ? formatAcademicDate(period.fecha_fin_periodo) : 'Sin fecha'}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Actividades</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{activities.filter((item) => item.actividad || item.fecha).length}</p>
          </article>
        </div>

        {readOnly && calendarId ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {!isPastAcademicPeriod(period.fecha_fin_periodo) && (
              <button
                type="button"
                onClick={() => navigate(`/admin/calendar/${calendarId}/edit`)}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                <Save className="h-4 w-4" />
                Editar periodo
              </button>
            )}
            <button
              type="button"
              onClick={backToList}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al historial
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AcademicCalendarScreen
