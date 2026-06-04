import { useEffect, useState } from 'react'
import { 
  UserPlus, 
  Eye, 
  Edit3, 
  Trash2, 
  X, 
  Shield, 
  Lock,
  Mail,
  User,
  CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'
import useAuth from '../hooks/useAuth'
import { userService } from '../services/api'

const emptyForm = {
  username: '',
  full_name: '',
  email: '',
  role: 'editor',
  password: '',
  is_active: true,
}

function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create') // 'create' | 'edit' | 'view'
  const [selectedUser, setSelectedUser] = useState(null)
  const [formData, setFormData] = useState(emptyForm)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const data = await userService.listUsers()
      setUsers(data)
    } catch (error) {
      const message = error.response?.data?.detail || 'No se pudieron cargar los usuarios'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex h-64 items-center justify-center rounded-[2.5rem] border border-red-100 bg-red-50 p-8 text-red-800">
        <p className="font-semibold">Acceso denegado. Se requieren permisos de administrador general.</p>
      </div>
    )
  }

  const openModal = (mode, user = null) => {
    setModalMode(mode)
    setSelectedUser(user)
    if (user) {
      setFormData({
        username: user.username || '',
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || 'editor',
        password: '',
        is_active: user.is_active ?? true,
      })
    } else {
      setFormData(emptyForm)
    }
    setIsModalOpen(true)
  }

  const handleDelete = (id) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return
    userService.deleteUser(id)
      .then(() => {
        setUsers((prev) => prev.filter((u) => u.id !== id))
        toast.error('Usuario eliminado del sistema', {
          icon: '🗑️',
        })
      })
      .catch((error) => {
        const message = error.response?.data?.detail || 'No se pudo eliminar el usuario'
        toast.error(message)
      })
  }

  const handleSubmit = async () => {
    try {
      if (modalMode === 'create') {
        await userService.createUser({
          username: formData.username.trim(),
          full_name: formData.full_name.trim() || formData.username.trim(),
          email: formData.email.trim() || null,
          role: formData.role,
          password: formData.password,
          is_active: formData.is_active,
        })
        toast.success('Usuario registrado correctamente')
      } else if (selectedUser) {
        const payload = {
          full_name: formData.full_name.trim(),
          email: formData.email.trim() || null,
          role: formData.role,
          is_active: formData.is_active,
        }
        if (formData.password) {
          payload.password = formData.password
        }
        await userService.updateUser(selectedUser.id, payload)
        toast.success('Usuario actualizado correctamente')
      }
      await fetchUsers()
      setIsModalOpen(false)
    } catch (error) {
      const message = error.response?.data?.detail || 'No se pudo guardar el usuario'
      toast.error(message)
    }
  }

  return (
    <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Control de Usuarios</h2>
          <p className="mt-1 text-sm text-slate-500">Administra los accesos y roles de la plataforma administrativa</p>
        </div>
        <button 
          onClick={() => openModal('create')}
          className="flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 active:scale-95"
        >
          <UserPlus className="h-5 w-5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-slate-50/30 shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Cargando usuarios...</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-5">Identidad</th>
                  <th className="px-6 py-5">Rol Asignado</th>
                  <th className="px-6 py-5">Estado</th>
                  <th className="px-6 py-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 font-bold border border-sky-100/50">
                          {(u.full_name || u.username || 'US').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 transition group-hover:text-sky-700">{u.full_name || u.username}</p>
                          <p className="text-xs text-slate-500 font-medium">Usuario: {u.username}</p>
                          {u.email && <p className="text-xs text-slate-400 font-medium">{u.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-[11px] font-bold uppercase tracking-tight ${
                        u.role === 'admin' 
                          ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-100' 
                          : 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                      }`}>
                        <Shield className="h-3 w-3" />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => openModal('view', u)}
                          className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-sky-600 transition-all"
                          title="Ver detalles"
                        >
                          <Eye className="h-4.5 w-4.5" />
                        </button>
                        <button 
                          onClick={() => openModal('edit', u)}
                          className="rounded-xl p-2.5 text-slate-400 hover:bg-slate-100 hover:text-amber-600 transition-all"
                          title="Editar"
                        >
                          <Edit3 className="h-4.5 w-4.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="rounded-xl p-2.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL MULTIPROPÓSITO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/20 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                  {modalMode === 'create' ? <UserPlus /> : modalMode === 'edit' ? <Edit3 /> : <Eye />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {modalMode === 'create' ? 'Crear Nuevo Usuario' : modalMode === 'edit' ? 'Editar Usuario' : 'Detalles de Usuario'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500">Información de acceso institucional</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form className="space-y-5" onSubmit={(e) => {
              e.preventDefault()
              if (modalMode !== 'view') handleSubmit()
            }}>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Usuario</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                    readOnly={modalMode !== 'create'}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-sky-500 focus:bg-white transition-all disabled:opacity-70"
                    placeholder="Ej: cajaya1"
                  />
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Nombre Completo</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <input 
                      type="text" 
                      value={formData.full_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                      readOnly={modalMode === 'view'}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-sky-500 focus:bg-white transition-all disabled:opacity-70"
                      placeholder="Ej: Juan Pérez"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Correo Institucional</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                      readOnly={modalMode === 'view'}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-sky-500 focus:bg-white transition-all disabled:opacity-70"
                      placeholder="usuario@espe.edu.ec"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Rol en el Sistema</label>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                      disabled={modalMode === 'view'}
                      className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-sky-500 focus:bg-white transition-all disabled:opacity-70"
                    >
                      <option value="admin">Administrador General</option>
                      <option value="editor">Editor Académico</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                    <input 
                      type="password" 
                      placeholder={modalMode === 'view' ? '••••••••' : 'Cambiar contraseña...'}
                      readOnly={modalMode === 'view'}
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-sky-500 focus:bg-white transition-all disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                <button 
                   onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-2xl border border-slate-200 px-6 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {modalMode === 'view' ? 'Cerrar' : 'Cancelar'}
                </button>
                {modalMode !== 'view' && (
                  <button 
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all active:scale-95"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    <span>{modalMode === 'create' ? 'Confirmar Registro' : 'Guardar Cambios'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminUsers
