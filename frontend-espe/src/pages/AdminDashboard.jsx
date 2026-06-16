import { FileText, Mail, Pencil, Phone, Users2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { configService, procesoService, userService } from '../services/api'
import useAuth from '../hooks/useAuth'

// Campo de configuración bloqueado por defecto: se habilita con el botón "Editar"
// y se confirma con "Guardar" o se descarta con "Cancelar". Solo los admins ven
// los botones de edición.
function CampoConfigEditable({ icon: Icon, label, descripcion, value, type, placeholder, canEdit, onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setDraft(value)
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft(value)
    setEditing(false)
  }

  const handleSave = async () => {
    const nuevoValor = draft.trim()
    if (!nuevoValor) return
    setSaving(true)
    try {
      await onSave(nuevoValor)
      setEditing(false)
    } catch {
      // el padre ya mostró el toast de error; se mantiene el modo edición
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 space-y-3">
      <div className="flex items-center gap-2 text-slate-700">
        <Icon className="h-4 w-4 text-sky-600" />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="text-xs text-slate-500">{descripcion}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type={type}
          value={editing ? draft : value}
          disabled={!editing}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500"
        />
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-5 py-2.5 text-sm font-bold text-sky-700 shadow-sm transition hover:bg-sky-50"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        )}
        {canEdit && editing && (
          <>
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-sky-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function AdminDashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const displayName = user?.full_name || user?.username || 'Usuario'
  const [procesosSoportados, setProcesosSoportados] = useState(null)
  const [usuariosRegistrados, setUsuariosRegistrados] = useState(null)
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')

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

    const fetchConfig = async () => {
      try {
        const data = await configService.getCorreoSoporte()
        setCorreo(data.correo)
      } catch {
        setCorreo('carrera_itiv@espe.edu.ec')
      }
      try {
        const data = await configService.getTelefonoSoporte()
        setTelefono(data.telefono)
      } catch {
        setTelefono('(02) 3989-400')
      }
    }

    fetchMetrics()
    fetchConfig()
  }, [])

  const guardarCorreo = async (nuevoCorreo) => {
    try {
      await configService.setCorreoSoporte(nuevoCorreo)
      setCorreo(nuevoCorreo)
      toast.success('Correo de atención actualizado')
    } catch {
      toast.error('No se pudo guardar el correo')
      throw new Error('save failed')
    }
  }

  const guardarTelefono = async (nuevoTelefono) => {
    try {
      await configService.setTelefonoSoporte(nuevoTelefono)
      setTelefono(nuevoTelefono)
      toast.success('Teléfono de atención actualizado')
    } catch {
      toast.error('No se pudo guardar el teléfono')
      throw new Error('save failed')
    }
  }

  const adminMetrics = [
    { label: 'Procesos Soportados', value: procesosSoportados, icon: FileText },
    { label: 'Usuarios Registrados', value: usuariosRegistrados, icon: Users2 },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="max-w-4xl px-2">
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Información
        </h1>
        <p className="mt-3 text-sm font-semibold text-slate-500">
          Sesión activa: <span className="text-slate-700">{displayName}</span>
        </p>
      </div>

      <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-8">
        {/* Métricas */}
        <div className="grid gap-2 md:grid-cols-2">
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

        {/* Datos de contacto del sitio público */}
        <div className="grid gap-2 md:grid-cols-2">
          <CampoConfigEditable
            icon={Mail}
            label="Correo de atención al estudiante"
            descripcion="Este correo se muestra en el footer del sitio público. Solo administradores pueden modificarlo."
            value={correo}
            type="email"
            placeholder="correo@espe.edu.ec"
            canEdit={isAdmin}
            onSave={guardarCorreo}
          />
          <CampoConfigEditable
            icon={Phone}
            label="Teléfono de atención"
            descripcion="Este número se muestra en el footer del sitio público. Solo administradores pueden modificarlo."
            value={telefono}
            type="tel"
            placeholder="(02) 3989-400"
            canEdit={isAdmin}
            onSave={guardarTelefono}
          />
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
