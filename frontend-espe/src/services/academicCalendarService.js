import * as XLSX from 'xlsx'

const STORAGE_KEY = 'espe.academic-calendar.periods'

const seedPeriods = [
  {
    id: 'si-2026',
    nombre_periodo: 'SI-2026: MARZO - AGOSTO 2026',
    fecha_fin_periodo: '2026-08-31',
    actividades: [
      { actividad: 'Inicio de clases', fecha: '2026-03-16' },
      { actividad: 'Registro de materias', fecha: '2026-03-23' },
      { actividad: 'Evaluaciones parciales', fecha: '2026-05-22' },
      { actividad: 'Cierre del periodo', fecha: '2026-08-31' },
    ],
    created_at: '2026-02-01T08:00:00.000Z',
    updated_at: '2026-02-01T08:00:00.000Z',
  },
  {
    id: 'sii-2025',
    nombre_periodo: 'SII-2025: OCTUBRE 2025 - FEBRERO 2026',
    fecha_fin_periodo: '2026-02-28',
    actividades: [
      { actividad: 'Apertura del periodo', fecha: '2025-10-06' },
      { actividad: 'Matriculación ordinaria', fecha: '2025-10-13' },
      { actividad: 'Exámenes finales', fecha: '2026-02-20' },
      { actividad: 'Cierre del periodo', fecha: '2026-02-28' },
    ],
    created_at: '2025-09-18T08:00:00.000Z',
    updated_at: '2025-09-18T08:00:00.000Z',
  },
]

const isBrowser = typeof window !== 'undefined'

const clonePeriods = (periods) =>
  periods.map((period) => ({
    ...period,
    actividades: (period.actividades || []).map((actividad) => ({ ...actividad })),
  }))

const normalizeDate = (value) => {
  if (!value) return ''
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return ''
    const year = String(parsed.y).padStart(4, '0')
    const month = String(parsed.m).padStart(2, '0')
    const day = String(parsed.d).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const text = String(value).trim()
  if (!text) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return text
}

const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const readPeriods = () => {
  if (!isBrowser) {
    return clonePeriods(seedPeriods)
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedPeriods))
    return clonePeriods(seedPeriods)
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return clonePeriods(seedPeriods)
    }
    return clonePeriods(parsed)
  } catch {
    return clonePeriods(seedPeriods)
  }
}

const writePeriods = (periods) => {
  if (!isBrowser) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(periods))
}

const createId = () => {
  if (isBrowser && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }

  return `calendar-${Date.now()}`
}

export const createEmptyActivity = () => ({
  actividad: '',
  fecha: '',
})

export const createEmptyPeriod = () => ({
  nombre_periodo: '',
  fecha_fin_periodo: '',
  actividades: [createEmptyActivity()],
})

export const listAcademicPeriods = () => readPeriods()

export const getAcademicPeriod = (periodId) =>
  readPeriods().find((period) => period.id === periodId) || null

export const saveAcademicPeriod = (payload, periodId = null) => {
  const periods = readPeriods()
  const now = new Date().toISOString()

  if (periodId) {
    const index = periods.findIndex((period) => period.id === periodId)
    if (index === -1) return null

    const updated = {
      ...periods[index],
      ...payload,
      id: periodId,
      updated_at: now,
    }
    periods[index] = updated
    writePeriods(periods)
    return updated
  }

  const created = {
    id: createId(),
    ...payload,
    created_at: now,
    updated_at: now,
  }
  periods.unshift(created)
  writePeriods(periods)
  return created
}

export const deleteAcademicPeriod = (periodId) => {
  const periods = readPeriods()
  const filtered = periods.filter((period) => period.id !== periodId)
  writePeriods(filtered)
  return filtered
}

export const isPastAcademicPeriod = (fechaFinPeriodo) => {
  if (!fechaFinPeriodo) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endDate = new Date(`${fechaFinPeriodo}T00:00:00`)
  if (Number.isNaN(endDate.getTime())) return false
  endDate.setHours(0, 0, 0, 0)

  return today > endDate
}

export const formatAcademicDate = (value) => {
  if (!value) return 'Sin fecha'

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export const formatPeriodLabel = (period) => {
  if (!period) return ''

  if (period.nombre_periodo) return period.nombre_periodo

  const fechaFin = period.fecha_fin_periodo ? formatAcademicDate(period.fecha_fin_periodo) : 'sin fecha'
  return `Periodo académico ${fechaFin}`
}

export const mapSpreadsheetRows = (worksheet) => {
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
  if (!rows.length) return []

  return rows
    .map((row) => {
      const normalizedEntries = Object.entries(row).reduce((accumulator, [key, value]) => {
        accumulator[normalizeText(key)] = value
        return accumulator
      }, {})

      const values = Object.values(row)
      const actividad =
        normalizedEntries.actividad ||
        normalizedEntries.activity ||
        normalizedEntries.nombre ||
        normalizedEntries.descripcion ||
        String(values[0] ?? '').trim()

      const fechaRaw =
        normalizedEntries.fecha ||
        normalizedEntries.date ||
        normalizedEntries['fecha de actividad'] ||
        values[1]

      const fecha = normalizeDate(fechaRaw)

      return {
        actividad: String(actividad || '').trim(),
        fecha,
      }
    })
    .filter((row) => row.actividad || row.fecha)
}

export const parseSpreadsheetFile = async (file) => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]

  if (!worksheet) {
    return []
  }

  return mapSpreadsheetRows(worksheet)
}

export const enforceMinimumDate = (activities) => {
  if (!activities.length || !activities[0]?.fecha) {
    return activities
  }

  const minimum = new Date(`${activities[0].fecha}T00:00:00`)
  if (Number.isNaN(minimum.getTime())) {
    return activities
  }

  return activities.map((activity, index) => {
    if (index === 0 || !activity.fecha) return activity

    const current = new Date(`${activity.fecha}T00:00:00`)
    if (Number.isNaN(current.getTime()) || current >= minimum) {
      return activity
    }

    return {
      ...activity,
      fecha: '',
    }
  })
}
