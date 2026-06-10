import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CalendarDays, Edit3, FileSpreadsheet, Plus, Save, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { calendarService } from '../services/api'

// ---------------------------------------------------------------------------
// Actividades fijas oficiales del calendario (orden canónico)
// ---------------------------------------------------------------------------
const ACTIVIDADES_FIJAS = [
  'Recepción de solicitudes de retiro voluntario',
  'Trámite de solicitudes de retiro voluntario',
  'Registro de retiro voluntario y actualización de matrícula',
  'Actividades académicas primer parcial',
  'Evaluaciones primer parcial',
  'Ingreso primera calificación al sistema académico',
  'Actividades académicas segundo parcial',
  'Evaluaciones segundo parcial',
  'Ingreso segunda calificación al sistema académico',
  'Examen final',
  'Ingreso de la calificación de examen final al sistema académico',
]

const EMPTY_FIXED_DATES = ACTIVIDADES_FIJAS.map(() => ({ fechaInicio: '', fechaFin: '' }))

const createDynamicRow = () => ({
  id: crypto.randomUUID ? crypto.randomUUID() : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  actividad: '',
  fechaInicio: '',
  fechaFin: '',
})

// ---------------------------------------------------------------------------
// Helpers: formatear y parsear texto de fechas
// ---------------------------------------------------------------------------
function formatFechaTexto(fechaInicio, fechaFin) {
  if (!fechaInicio) return ''
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const [y1, m1, d1] = fechaInicio.split('-').map(Number)
  const mesInicio = meses[m1 - 1]

  if (!fechaFin || fechaInicio === fechaFin) {
    return `${String(d1).padStart(2, '0')} de ${mesInicio} de ${y1}`
  }

  const [y2, m2, d2] = fechaFin.split('-').map(Number)
  const mesFin = meses[m2 - 1]

  if (m1 === m2 && y1 === y2) {
    return `${String(d1).padStart(2, '0')} al ${String(d2).padStart(2, '0')} de ${mesInicio} de ${y1}`
  }
  return `${String(d1).padStart(2, '0')} de ${mesInicio} al ${String(d2).padStart(2, '0')} de ${mesFin} de ${y2}`
}

function parseFechaTexto(texto) {
  if (!texto) return { inicio: '', fin: '' }
  const meses = { enero:'01', febrero:'02', marzo:'03', abril:'04', mayo:'05', junio:'06', julio:'07', agosto:'08', septiembre:'09', octubre:'10', noviembre:'11', diciembre:'12' }

  // "DD al DD de mes de YYYY"
  const r1 = texto.match(/(\d{1,2})\s+al\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)
  if (r1) {
    const [, d1, d2, mes, anio] = r1
    const m = meses[mes.toLowerCase()] || '01'
    return { inicio: `${anio}-${m}-${d1.padStart(2, '0')}`, fin: `${anio}-${m}-${d2.padStart(2, '0')}` }
  }

  // "DD de mes1 al DD de mes2 de YYYY"
  const r2 = texto.match(/(\d{1,2})\s+de\s+(\w+)\s+al\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)
  if (r2) {
    const [, d1, mes1, d2, mes2, anio] = r2
    return {
      inicio: `${anio}-${meses[mes1.toLowerCase()] || '01'}-${d1.padStart(2, '0')}`,
      fin: `${anio}-${meses[mes2.toLowerCase()] || '01'}-${d2.padStart(2, '0')}`,
    }
  }

  // "DD de mes de YYYY"
  const r3 = texto.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/)
  if (r3) {
    const [, d, mes, anio] = r3
    const m = meses[mes.toLowerCase()] || '01'
    const f = `${anio}-${m}-${d.padStart(2, '0')}`
    return { inicio: f, fin: f }
  }

  return { inicio: '', fin: '' }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
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
  const [saving, setSaving] = useState(false)
  const [nombre, setNombre] = useState('')
  const [fechaFinPeriodo, setFechaFinPeriodo] = useState('')
  const [esActual, setEsActual] = useState(false)
  const [fixedDates, setFixedDates] = useState(() => EMPTY_FIXED_DATES.map((x) => ({ ...x })))
  const [dynamicRows, setDynamicRows] = useState([])

  const today = new Date().toISOString().substring(0, 10)
  const isPast = mode !== 'create' && !!fechaFinPeriodo && fechaFinPeriodo < today
  const isReadOnly = mode === 'view' || isPast

  // ---------------------------------------------------------------------------
  // Carga de datos
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (mode === 'create') {
      setFixedDates(EMPTY_FIXED_DATES.map((x) => ({ ...x })))
      setDynamicRows([])
      setLoading(false)
      return
    }

    calendarService
      .getPeriodo(periodId)
      .then((periodo) => {
        setNombre(periodo.nombre || '')
        setFechaFinPeriodo(periodo.fecha_fin_periodo || '')
        setEsActual(periodo.es_actual || false)

        const newFixed = ACTIVIDADES_FIJAS.map(() => ({ fechaInicio: '', fechaFin: '' }))
        const dynamic = []

        for (const act of periodo.actividades || []) {
          const idx = ACTIVIDADES_FIJAS.findIndex(
            (n) => n.toLowerCase() === act.actividad.toLowerCase()
          )
          const parsed = parseFechaTexto(act.fecha_texto)
          const inicio = parsed.inicio || (act.fecha_orden ? String(act.fecha_orden).substring(0, 10) : '')
          const fin = parsed.fin || inicio

          if (idx !== -1) {
            newFixed[idx] = { fechaInicio: inicio, fechaFin: fin }
          } else {
            dynamic.push({ id: createDynamicRow().id, actividad: act.actividad, fechaInicio: inicio, fechaFin: fin })
          }
        }

        setFixedDates(newFixed)
        setDynamicRows([...dynamic].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)))
        setLoading(false)
      })
      .catch(() => {
        toast.error('Periodo no encontrado')
        navigate('/admin/calendar', { replace: true })
      })
  }, [mode, navigate, periodId])

  // ---------------------------------------------------------------------------
  // Handlers de actividades fijas
  // ---------------------------------------------------------------------------
  const updateFixedDate = (index, field, value) => {
    setFixedDates((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  // ---------------------------------------------------------------------------
  // Handlers de actividades dinámicas
  // ---------------------------------------------------------------------------
  const addDynamicRow = () => {
    if (isReadOnly) return
    setDynamicRows((prev) => [...prev, createDynamicRow()])
  }

  const updateDynamicRow = (id, field, value) => {
    setDynamicRows((prev) => {
      const updated = prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      // Re-ordenar descendente por fechaInicio cuando cambia ese campo
      if (field === 'fechaInicio') {
        return [...updated].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
      }
      return updated
    })
  }

  const removeDynamicRow = (id) => {
    if (isReadOnly) return
    setDynamicRows((prev) => prev.filter((row) => row.id !== id))
  }

  // ---------------------------------------------------------------------------
  // Importar desde CSV / Excel
  // ---------------------------------------------------------------------------
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

      const errorBase =
        'Columnas requeridas: "Actividad" (texto), "Fecha Inicio" (YYYY-MM-DD) y "Fecha Fin" (YYYY-MM-DD). ' +
        'La primera fila debe ser el encabezado con esos nombres exactos.'

      if (!rows.length) {
        toast.error(`El archivo no contiene filas utilizables. ${errorBase}`)
        return
      }

      const imported = rows
        .map((row) => {
          const actividad = String(
            row['Actividad'] || row['actividad'] || row['ACTIVIDAD'] || row['Activity'] || ''
          ).trim()
          const fechaInicio = String(
            row['Fecha Inicio'] || row['fecha_inicio'] || row['FechaInicio'] || row['Inicio'] || ''
          ).trim()
          const fechaFin = String(
            row['Fecha Fin'] || row['fecha_fin'] || row['FechaFin'] || row['Fin'] || fechaInicio
          ).trim()
          return { id: createDynamicRow().id, actividad, fechaInicio, fechaFin }
        })
        .filter((r) => r.actividad && r.fechaInicio)

      if (!imported.length) {
        toast.error(`El archivo no contiene filas utilizables. ${errorBase}`)
        return
      }

      // Separar actividades fijas de dinámicas
      const newFixed = ACTIVIDADES_FIJAS.map(() => ({ fechaInicio: '', fechaFin: '' }))
      const newDynamic = []

      for (const row of imported) {
        const idx = ACTIVIDADES_FIJAS.findIndex(
          (n) => n.toLowerCase() === row.actividad.toLowerCase()
        )
        if (idx !== -1) {
          newFixed[idx] = { fechaInicio: row.fechaInicio, fechaFin: row.fechaFin }
        } else {
          newDynamic.push(row)
        }
      }

      setFixedDates(newFixed)
      setDynamicRows([...newDynamic].sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)))
      toast.success('Archivo importado correctamente')
    } catch {
      toast.error('No se pudo leer el archivo seleccionado')
    } finally {
      event.target.value = ''
    }
  }

  // ---------------------------------------------------------------------------
  // Guardar
  // ---------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (isReadOnly) return

    if (!nombre.trim() || !fechaFinPeriodo) {
      toast.error('Completa el nombre del periodo y la fecha de finalización.')
      return
    }

    const actividades = []

    ACTIVIDADES_FIJAS.forEach((nombreAct, i) => {
      const { fechaInicio, fechaFin } = fixedDates[i]
      if (fechaInicio) {
        actividades.push({
          actividad: nombreAct,
          fecha_texto: formatFechaTexto(fechaInicio, fechaFin),
          fecha_orden: fechaInicio,
        })
      }
    })

    for (const row of dynamicRows) {
      if (row.actividad.trim() && row.fechaInicio) {
        actividades.push({
          actividad: row.actividad.trim(),
          fecha_texto: formatFechaTexto(row.fechaInicio, row.fechaFin),
          fecha_orden: row.fechaInicio,
        })
      }
    }

    if (!actividades.length) {
      toast.error('Agrega al menos una actividad con fecha de inicio.')
      return
    }

    const payload = {
      nombre: nombre.trim(),
      fecha_fin_periodo: fechaFinPeriodo,
      es_actual: esActual,
      actividades,
    }

    setSaving(true)
    try {
      if (mode === 'create') {
        await calendarService.crearPeriodo(payload)
        toast.success('Periodo creado correctamente')
      } else {
        await calendarService.actualizarPeriodo(periodId, payload)
        toast.success('Periodo actualizado correctamente')
      }
      navigate('/admin/calendar')
    } catch (error) {
      const msg = error.response?.data?.detail || 'No se pudo guardar el periodo'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Cargando periodo...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ENCABEZADO */}
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
                ? 'Visualización del periodo académico y sus actividades.'
                : 'Completa los datos del periodo y configura las fechas de cada actividad.'}
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

      {isPast && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Periodo pasado detectado por fecha de finalización. Las acciones de edición permanecen bloqueadas.
        </div>
      )}

      {/* DATOS GENERALES */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-800">Datos generales</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Nombre del periodo</span>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
              placeholder="Ej. SI-2026: MARZO - AGOSTO 2026"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Fecha de finalización</span>
            <input
              type="date"
              value={fechaFinPeriodo}
              onChange={(e) => setFechaFinPeriodo(e.target.value)}
              disabled={isReadOnly}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
            <input
              type="checkbox"
              checked={esActual}
              onChange={(e) => setEsActual(e.target.checked)}
              disabled={isReadOnly}
              className="h-5 w-5 accent-sky-600"
            />
            <div>
              <p className="text-sm font-bold text-slate-700">Periodo activo (actual)</p>
              <p className="text-xs text-slate-500">El chatbot usará este calendario para evaluar fechas y plazos.</p>
            </div>
          </label>
        </div>
      </section>

      {/* ACTIVIDADES FIJAS */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900">Actividades oficiales del periodo</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ingresa el rango de fechas de cada actividad. El texto de fecha se genera automáticamente.
          </p>
        </div>

        <div className="space-y-3">
          {ACTIVIDADES_FIJAS.map((nombreAct, i) => (
            <div key={nombreAct} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-black text-sky-700">
                  {i + 1}
                </span>
                {nombreAct}
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Fecha Inicio
                  </span>
                  <input
                    type="date"
                    value={fixedDates[i].fechaInicio}
                    onChange={(e) => updateFixedDate(i, 'fechaInicio', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Fecha Fin
                  </span>
                  <input
                    type="date"
                    value={fixedDates[i].fechaFin}
                    onChange={(e) => updateFixedDate(i, 'fechaFin', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
                  />
                </label>
              </div>
              {fixedDates[i].fechaInicio ? (
                <p className="mt-2 text-xs font-medium text-sky-600">
                  Vista previa: &quot;{formatFechaTexto(fixedDates[i].fechaInicio, fixedDates[i].fechaFin)}&quot;
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* FECHAS ADICIONALES DINÁMICAS */}
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Fechas adicionales</h2>
            <p className="mt-1 text-sm text-slate-500">
              Actividades extra, ordenadas automáticamente por fecha de inicio (descendente).
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Importar CSV/Excel
              </button>
              <button
                type="button"
                onClick={addDynamicRow}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
              >
                <Plus className="h-4 w-4" />
                Añadir nueva fecha
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={importFile}
          disabled={isReadOnly}
        />

        {dynamicRows.length > 0 ? (
          <div className="space-y-3">
            {dynamicRows.map((row) => (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="mb-3">
                  <input
                    type="text"
                    value={row.actividad}
                    onChange={(e) => updateDynamicRow(row.id, 'actividad', e.target.value)}
                    disabled={isReadOnly}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
                    placeholder="Nombre de la actividad adicional"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Fecha Inicio
                    </span>
                    <input
                      type="date"
                      value={row.fechaInicio}
                      onChange={(e) => updateDynamicRow(row.id, 'fechaInicio', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Fecha Fin
                    </span>
                    <input
                      type="date"
                      value={row.fechaFin}
                      onChange={(e) => updateDynamicRow(row.id, 'fechaFin', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 disabled:bg-slate-100"
                    />
                  </label>
                </div>
                {row.fechaInicio ? (
                  <p className="mt-2 text-xs font-medium text-sky-600">
                    Vista previa: &quot;{formatFechaTexto(row.fechaInicio, row.fechaFin)}&quot;
                  </p>
                ) : null}
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => removeDynamicRow(row.id)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Quitar
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
            No hay fechas adicionales. Usa el botón &quot;Añadir nueva fecha&quot; para agregar actividades extra.
          </div>
        )}

        {/* BOTONES DE ACCIÓN */}
        {!isReadOnly && (
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar periodo'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/calendar')}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>
        )}

        {mode === 'view' && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to={`/admin/calendar/${periodId}/edit`}
              className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 px-5 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-50"
            >
              <Edit3 className="h-4 w-4" />
              Editar periodo
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminAcademicCalendarForm
