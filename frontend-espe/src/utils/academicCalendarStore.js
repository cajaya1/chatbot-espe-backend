const STORAGE_KEY = 'espe.academic-calendar-periods'

const createId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `calendar-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const seedCalendars = [
  {
    id: 'calendar-si-2025',
    nombre_periodo: 'SI-2025',
    fecha_fin_periodo: '2025-08-31',
    actividades: [
      { actividad: 'Inicio de clases', fecha: '2025-04-28' },
      { actividad: 'Evaluación parcial', fecha: '2025-06-20' },
      { actividad: 'Exámenes finales', fecha: '2025-08-22' },
    ],
    createdAt: '2025-03-01T00:00:00.000Z',
    updatedAt: '2025-03-01T00:00:00.000Z',
  },
  {
    id: 'calendar-si-2026',
    nombre_periodo: 'SI-2026',
    fecha_fin_periodo: '2026-08-31',
    actividades: [
      { actividad: 'Inicio de clases', fecha: '2026-03-16' },
      { actividad: 'Seguimiento académico', fecha: '2026-05-08' },
      { actividad: 'Cierre de periodo', fecha: '2026-08-28' },
    ],
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-15T00:00:00.000Z',
  },
]

export const createEmptyActivity = () => ({
  id: createId(),
  actividad: '',
  fecha: '',
})

export const createEmptyCalendar = () => ({
  id: createId(),
  nombre_periodo: '',
  fecha_fin_periodo: '',
  actividades: [createEmptyActivity()],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const getSeedCalendars = () => seedCalendars.map((calendar) => ({
  ...calendar,
  actividades: calendar.actividades.map((activity) => ({ ...activity })),
}))

export const loadAcademicCalendars = () => {
  if (typeof window === 'undefined') {
    return getSeedCalendars()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = getSeedCalendars()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      throw new Error('Formato invalido')
    }

    return parsed
  } catch {
    const initial = getSeedCalendars()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
}

export const saveAcademicCalendars = (calendars) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(calendars))
}

export const getAcademicCalendarById = (calendarId) => {
  const calendars = loadAcademicCalendars()
  return calendars.find((calendar) => calendar.id === calendarId) || null
}

export const upsertAcademicCalendar = (payload) => {
  const calendars = loadAcademicCalendars()
  const now = new Date().toISOString()
  const existingIndex = calendars.findIndex((calendar) => calendar.id === payload.id)
  const calendar = {
    ...payload,
    updatedAt: now,
    createdAt: payload.createdAt || now,
  }

  if (existingIndex >= 0) {
    calendars[existingIndex] = calendar
  } else {
    calendars.unshift(calendar)
  }

  saveAcademicCalendars(calendars)
  return calendar
}

export const deleteAcademicCalendar = (calendarId) => {
  const calendars = loadAcademicCalendars().filter((calendar) => calendar.id !== calendarId)
  saveAcademicCalendars(calendars)
  return calendars
}

export const isPastAcademicCalendar = (fechaFinPeriodo) => {
  if (!fechaFinPeriodo) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(`${fechaFinPeriodo}T00:00:00`)
  return today > endDate
}

export const formatAcademicPeriodLabel = (calendar) => {
  const activities = [...(calendar.actividades || [])]
    .filter((activity) => activity?.fecha)
    .sort((left, right) => left.fecha.localeCompare(right.fecha))

  if (!activities.length) {
    return calendar.nombre_periodo
  }

  const firstDate = new Date(`${activities[0].fecha}T00:00:00`)
  const lastDate = new Date(`${activities[activities.length - 1].fecha}T00:00:00`)
  const firstMonth = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(firstDate).toUpperCase()
  const lastMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(lastDate).toUpperCase()

  return `${calendar.nombre_periodo}: ${firstMonth} - ${lastMonth}`
}

export const normalizeImportedDate = (value) => {
  if (!value) return ''

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    const converted = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000)
    return converted.toISOString().slice(0, 10)
  }

  const asString = String(value).trim()
  if (!asString) return ''

  if (/^\d{4}-\d{2}-\d{2}$/.test(asString)) {
    return asString
  }

  const parsed = new Date(asString)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return ''
}

export const mapImportedCalendarRows = (rows) => {
  return rows
    .map((row) => {
      const activity =
        row.Actividad ??
        row.actividad ??
        row.ACTIVIDAD ??
        row.Activity ??
        row.activity ??
        row.Tarea ??
        row.tarea ??
        row.Descripcion ??
        row.descripcion ??
        ''

      const fecha = normalizeImportedDate(
        row.Fecha ??
        row.fecha ??
        row.DATE ??
        row.Date ??
        row.date ??
        row.FechA ??
        ''
      )

      return {
        id: createId(),
        actividad: String(activity).trim(),
        fecha,
      }
    })
    .filter((row) => row.actividad || row.fecha)
}