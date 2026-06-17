import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  Check,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Filter,
  FolderTree,
  Hash,
  Layers,
  Paperclip,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { procesoService, categoriaService } from '../services/api'
import useAuth from '../hooks/useAuth'
import { downloadAnexo, getAnexoDisplayName } from '../utils/anexos'

const emptyForm = {
  codigo_proceso: '',
  titulo: '',
  activo: true,
  flujo_pasos: [''],
  contexto_legal: '',
  ruta_anexo: '',
  categoria_id: '',
}

function AdminDocuments() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [procesos, setProcesos] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [selectedProceso, setSelectedProceso] = useState(null)
  const [formData, setFormData] = useState(emptyForm)
  const [searchQuery, setSearchQuery] = useState('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyItems, setHistoryItems] = useState([])
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [procesoToDelete, setProcesoToDelete] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'inactive'
  const [anexoFile, setAnexoFile] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [isCategoriaModalOpen, setIsCategoriaModalOpen] = useState(false)
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [categoriaEditId, setCategoriaEditId] = useState(null)
  const [categoriaEditNombre, setCategoriaEditNombre] = useState('')


  const fetchProcesos = async () => {
    setLoading(true)
    try {
      const data = await procesoService.listProcesos()
      setProcesos(data)
    } catch (error) {
      const message = error.response?.data?.detail || 'No se pudieron cargar los procesos'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategorias = async () => {
    try {
      const data = await categoriaService.listar()
      setCategorias(data)
    } catch {
      // Silencioso: el select de categorías quedará vacío si falla.
    }
  }

  useEffect(() => {
    const init = async () => {
      await fetchProcesos()
      await fetchCategorias()
    }
    init()
  }, [])

  const filteredProcesos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    
    return procesos.filter((item) => {
      // Filtro por búsqueda (Título o Código)
      const matchesSearch = query === '' || 
        item.titulo.toLowerCase().includes(query) ||
        item.codigo_proceso.toLowerCase().includes(query)
      
      // Filtro por estado (Activo/Inactivo)
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && item.activo) || 
        (statusFilter === 'inactive' && !item.activo)

      return matchesSearch && matchesStatus
    })
  }, [procesos, searchQuery, statusFilter])

  const openModal = (mode, proceso = null) => {
    setModalMode(mode) // 'create', 'edit', 'view'
    setSelectedProceso(proceso)
    if (proceso) {
      setFormData({
        codigo_proceso: proceso.codigo_proceso,
        titulo: proceso.titulo,
        activo: proceso.activo,
        flujo_pasos: proceso.flujo_pasos?.length ? proceso.flujo_pasos : [''],
        contexto_legal: proceso.contexto_legal,
        ruta_anexo: proceso.ruta_anexo || '',
        categoria_id: proceso.categoria_id ?? '',
      })
    } else {
      // Generar código según el número correlativo (PROC-0X)
      const lastNum = procesos.length > 0 
        ? Math.max(...procesos.map(p => {
            const match = p.codigo_proceso.match(/PROC-0(\d+)/)
            return match ? parseInt(match[1]) : 0
          }))
        : 0
      
      const newCode = `PROC-0${lastNum + 1}`
      
      setFormData({
        ...emptyForm,
        codigo_proceso: newCode,
      })
    }
    setAnexoFile(null)
    setIsModalOpen(true)
  }

  const handleDelete = (proceso) => {
    setProcesoToDelete(proceso)
    setIsDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!procesoToDelete) return
    setIsDeleteConfirmOpen(false)

    toast.promise(procesoService.deleteProceso(procesoToDelete.codigo_proceso), {
      loading: `Eliminando "${procesoToDelete.titulo}"...`,
      success: () => {
        fetchProcesos()
        return `Proceso "${procesoToDelete.titulo}" eliminado correctamente`
      },
      error: (error) => error.response?.data?.detail || 'No se pudo eliminar el proceso',
    })
  }

  const updatePaso = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.flujo_pasos]
      updated[index] = value
      return { ...prev, flujo_pasos: updated }
    })
  }

  const addPaso = () => {
    setFormData((prev) => ({ ...prev, flujo_pasos: [...prev.flujo_pasos, ''] }))
  }

  const removePaso = (index) => {
    setFormData((prev) => {
      const updated = prev.flujo_pasos.filter((_, idx) => idx !== index)
      return { ...prev, flujo_pasos: updated.length ? updated : [''] }
    })
  }

  const handleSubmit = async () => {
    const codigo = formData.codigo_proceso.trim()
    const titulo = formData.titulo.trim()
    const contexto = formData.contexto_legal.trim()
    const pasos = formData.flujo_pasos.map((p) => p.trim()).filter(Boolean)

    if (modalMode === 'create') {
      if (!titulo || !contexto || pasos.length === 0) {
        toast.error('Completa título, pasos y texto legal.')
        return
      }
    } else {
      if (!codigo || !titulo || !contexto || pasos.length === 0) {
        toast.error('Completa todos los campos requeridos.')
        return
      }
    }

    if (!formData.categoria_id) {
      toast.error('Selecciona una categoría para el proceso.')
      return
    }

    let rutaAnexo = formData.ruta_anexo?.trim() || null
    if (anexoFile) {
      try {
        const uploadData = await procesoService.uploadAnexo(anexoFile)
        rutaAnexo = uploadData.url
      } catch {
        toast.error('No se pudo subir el archivo. Intenta de nuevo.')
        return
      }
    }

    const payload = {
      codigo_proceso: codigo || null,
      titulo,
      activo: formData.activo,
      flujo_pasos: pasos,
      contexto_legal: contexto,
      ruta_anexo: rutaAnexo,
      categoria_id: formData.categoria_id ? Number(formData.categoria_id) : null,
    }

    const savePromise = modalMode === 'create'
      ? procesoService.createProceso(payload)
      : procesoService.updateProceso(selectedProceso.codigo_proceso, payload)

    toast.promise(savePromise, {
      loading: modalMode === 'create' ? 'Creando nuevo proceso...' : 'Actualizando y versionando...',
      success: () => {
        fetchProcesos() // Actualiza la lista de procesos (recarga la data)
        setIsModalOpen(false) // Cierra el modal automáticamente
        return modalMode === 'create'
          ? '¡Proceso creado con éxito!'
          : '¡Proceso actualizado con éxito!'
      },
      error: (error) => error.response?.data?.detail || 'No se pudo guardar el proceso',
    })
  }

  const openHistory = async (proceso) => {
    setSelectedProceso(proceso)
    setIsHistoryOpen(true)
    setHistoryLoading(true)
    try {
      const data = await procesoService.listHistorial(proceso.codigo_proceso)
      setHistoryItems(data)
    } catch (error) {
      const message = error.response?.data?.detail || 'No se pudo cargar el historial'
      toast.error(message)
      setHistoryItems([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleRollback = (proceso) => {
    toast((t) => (
      <div className="flex flex-col gap-3 p-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 line-clamp-1">¿Deshacer versión {proceso.version}?</p>
            <p className="text-xs text-slate-500">Se restaurará la versión {proceso.version - 1} de este proceso.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-50 pt-2">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id)
              executeRollback(proceso)
            }}
            className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-100 transition hover:bg-orange-700 active:scale-95"
          >
            Sí, revertir
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'top-center',
      style: {
        minWidth: '350px',
        padding: '16px',
        borderRadius: '24px',
        border: '1px solid #f1f5f9',
      }
    })
  }

  const executeRollback = async (proceso) => {
    toast.promise(procesoService.rollbackProceso(proceso.codigo_proceso), {
      loading: 'Regresando a la versión anterior...',
      success: () => {
        setIsHistoryOpen(false)
        fetchProcesos()
        return '¡Se ha revertido con éxito! Se restauró la versión anterior.'
      },
      error: (error) => error.response?.data?.detail || 'No se pudo regresar a la versión anterior',
    })
  }

  const crearCategoria = async () => {
    const nombre = nuevaCategoria.trim()
    if (!nombre) return
    try {
      await categoriaService.crear({ nombre })
      setNuevaCategoria('')
      fetchCategorias()
      toast.success('Categoría creada')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo crear la categoría')
    }
  }

  const guardarEdicionCategoria = async (id) => {
    const nombre = categoriaEditNombre.trim()
    if (!nombre) return
    try {
      await categoriaService.actualizar(id, { nombre })
      setCategoriaEditId(null)
      setCategoriaEditNombre('')
      fetchCategorias()
      toast.success('Categoría actualizada')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo actualizar la categoría')
    }
  }

  const eliminarCategoria = async (categoria) => {
    try {
      await categoriaService.eliminar(categoria.id)
      fetchCategorias()
      fetchProcesos() // los procesos de esa categoría quedan sin categoría
      toast.success(`Categoría "${categoria.nombre}" eliminada`)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'No se pudo eliminar la categoría')
    }
  }

  return (
    <section className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Gestión de Procesos Académicos</h2>
          <p className="mt-1 text-sm text-slate-500">Crea, versiona y publica los procesos vigentes para el chatbot.</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsCategoriaModalOpen(true)}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-sky-300 hover:text-sky-700 active:scale-95"
            >
              <FolderTree className="h-5 w-5" />
              <span>Categorías</span>
            </button>
          )}
          <button
            onClick={() => openModal('create')}
            className="flex items-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            <span>Nuevo proceso</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por título o código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition-all focus:border-sky-500 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-sky-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                statusFilter === 'active'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                statusFilter === 'inactive'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Inactivos
            </button>
          </div>
          <div className="h-8 w-[1px] bg-slate-200 mx-1" />
          <div className="flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2 text-xs font-bold text-sky-700">
            <Filter className="h-3.5 w-3.5" />
            <span>{filteredProcesos.length} resultados</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-8 text-sm text-slate-500">
            Cargando procesos...
          </div>
        ) : filteredProcesos.length > 0 ? (
          filteredProcesos.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col gap-4 rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-sky-200 hover:shadow-md md:flex-row md:items-center"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                <FileText className="h-7 w-7" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="truncate font-bold text-slate-900">{item.titulo}</h3>
                <div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5 text-sky-400" />
                    {item.codigo_proceso}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-400" />
                    Version {item.version}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
                    {item.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FolderTree className="h-3.5 w-3.5 text-violet-400" />
                    {categorias.find((c) => c.id === item.categoria_id)?.nombre || 'Sin categoría'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal('view', item)}
                  title="Visualizar detalles"
                  className="rounded-xl border border-slate-100 bg-white p-2 text-slate-500 transition hover:border-sky-200 hover:text-sky-700"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => openModal('edit', item)}
                    className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-sky-200 hover:text-sky-700"
                  >
                    Editar / Versionar
                  </button>
                )}
                <button
                  onClick={() => openHistory(item)}
                  className="rounded-xl border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-500 transition hover:border-slate-200 hover:text-slate-700"
                >
                  Ver historial
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(item)}
                    className="rounded-xl border border-red-50 p-2 text-red-300 transition hover:border-red-200 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-200 py-16 text-slate-400">
            <FileText className="h-12 w-12 opacity-20" />
            <p className="mt-4 font-medium">No se encontraron procesos</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-[2.5rem] border border-white/20 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {modalMode === 'create' ? 'Crear nuevo proceso' : modalMode === 'view' ? 'Detalles del proceso' : 'Actualizar proceso'}
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  {modalMode === 'view' ? 'Vista de lectura' : 'Los cambios generan una nueva version vigente.'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">Titulo del proceso</label>
                  <input
                    type="text"
                    value={formData.titulo}
                    readOnly={modalMode === 'view'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titulo: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-sky-500 focus:bg-white read-only:opacity-70"
                    placeholder="Ej. Retiro voluntario"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">Código del proceso</label>
                  <input
                    type="text"
                    value={formData.codigo_proceso}
                    disabled={true}
                    readOnly={true}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3.5 text-sm font-mono font-bold text-slate-600 outline-none cursor-not-allowed opacity-80"
                    placeholder="Generando código..."
                  />
                  <p className="mt-1 text-[10px] text-slate-400 italic">Identificador único generado automáticamente.</p>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">Categoría</label>
                  <select
                    value={String(formData.categoria_id ?? '')}
                    disabled={modalMode === 'view'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, categoria_id: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm outline-none focus:border-sky-500 focus:bg-white disabled:opacity-70"
                  >
                    <option value="">Selecciona una categoría…</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-slate-400 italic">Agrupa el proceso en el menú del chatbot (no afecta la IA).</p>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">Formato Word adjunto</label>
                  <div className="mt-2 space-y-2">
                    {/* Archivo existente */}
                    {formData.ruta_anexo && !anexoFile && (
                      <div className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2.5">
                        <Paperclip className="h-4 w-4 shrink-0 text-sky-500" />
                        <span className="flex-1 truncate text-xs font-semibold text-sky-700">
                          {getAnexoDisplayName(formData.ruta_anexo)}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadAnexo(formData.ruta_anexo)}
                          title="Descargar formato"
                          className="rounded-lg p-1 text-sky-500 transition hover:bg-sky-100"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {modalMode !== 'view' && (
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, ruta_anexo: '' }))}
                            title="Eliminar formato adjunto"
                            className="rounded-lg p-1 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    {/* Nuevo archivo seleccionado (previsualización) */}
                    {anexoFile && (
                      <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                        <Paperclip className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="flex-1 truncate text-xs font-semibold text-emerald-700">
                          {anexoFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setAnexoFile(null)}
                          className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {/* Input de archivo (solo en modo editar/crear) */}
                    {modalMode !== 'view' && !anexoFile && (
                      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 transition hover:border-sky-300 hover:text-sky-600">
                        <Paperclip className="h-4 w-4 shrink-0" />
                        <span className="text-xs">
                          {formData.ruta_anexo ? 'Reemplazar archivo…' : 'Adjuntar formato Word…'}
                        </span>
                        <input
                          type="file"
                          accept=".doc,.docx"
                          className="hidden"
                          onChange={(e) => setAnexoFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    )}
                    {modalMode === 'view' && !formData.ruta_anexo && (
                      <p className="text-xs text-slate-400 italic">Sin formato adjunto</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Proceso Activo</p>
                    <p className="text-xs text-slate-500">Solo los activos se muestran al estudiante.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    disabled={modalMode === 'view'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, activo: e.target.checked }))}
                    className="h-5 w-5 accent-sky-600"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">Flujo de pasos</label>
                  <div className="mt-2 max-h-56 overflow-y-auto space-y-3 pr-1">
                    {formData.flujo_pasos.map((paso, index) => (
                      <div key={`paso-${index}`} className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                          {index + 1}
                        </span>
                        <input
                          type="text"
                          value={paso}
                          readOnly={modalMode === 'view'}
                          onChange={(e) => updatePaso(index, e.target.value)}
                          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-sky-500 focus:bg-white read-only:opacity-70"
                          placeholder={`Paso ${index + 1}`}
                        />
                        {modalMode !== 'view' && (
                          <button
                            type="button"
                            onClick={() => removePaso(index)}
                            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-red-500"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {modalMode !== 'view' && (
                    <button
                      type="button"
                      onClick={addPaso}
                      className="mt-2 w-full rounded-2xl border border-dashed border-slate-200 py-2.5 text-xs font-bold text-slate-500 hover:border-sky-300 hover:text-sky-600"
                    >
                      + Agregar paso
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Contexto legal — ancho completo fuera del grid de dos columnas */}
            <div className="mt-4">
              <label className="text-sm font-bold text-slate-700">Texto legal (contexto para IA)</label>
              <textarea
                value={formData.contexto_legal}
                readOnly={modalMode === 'view'}
                onChange={(e) => setFormData((prev) => ({ ...prev, contexto_legal: e.target.value }))}
                rows={6}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:bg-white read-only:opacity-70"
                placeholder="Pega aquí el articulado o resumen normativo vigente."
              />
            </div>

            <div className="pt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                {modalMode === 'view' ? 'Cerrar' : 'Cancelar'}
              </button>
              {modalMode !== 'view' && (modalMode === 'create' || isAdmin) && (
                <button
                  onClick={handleSubmit}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-sky-200 hover:bg-sky-700 transition-all active:scale-95"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Guardar cambios</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isHistoryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={() => setIsHistoryOpen(false)}
          />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-white/20 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Historial de versiones</h3>
                <p className="text-xs font-medium text-slate-500">
                  {selectedProceso?.codigo_proceso} · {selectedProceso?.titulo}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-3">
              {historyLoading ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm text-slate-500">
                  Cargando historial...
                </div>
              ) : historyItems.length > 0 ? (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-slate-400">Version {item.version}</p>
                        <p className="font-semibold text-slate-900">{item.titulo}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && item.es_actual && item.version > 1 && (
                          <button
                            onClick={() => handleRollback(item)}
                            title="Eliminar esta versión y volver a la anterior"
                            className="flex items-center gap-1.5 rounded-lg border border-orange-100 bg-orange-50 px-3 py-1.5 text-[10px] font-bold text-orange-600 transition hover:bg-orange-100"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Deshacer versión
                          </button>
                        )}
                        <span className="text-xs font-semibold text-slate-500">
                          {item.fecha_creacion}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
                      <span>Activo: {item.activo ? 'Si' : 'No'}</span>
                      <span>Actual: {item.es_actual ? 'Si' : 'No'}</span>
                      {item.ruta_anexo && <span>Anexo: {item.ruta_anexo}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-xs text-slate-400">
                  No hay versiones registradas.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsDeleteConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/20 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">¿Confirmar eliminación?</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Estás a punto de eliminar el proceso <span className="font-bold text-slate-700">"{procesoToDelete?.titulo}"</span>.
                Esta acción es irreversible y borrará el historial de versiones y el conocimiento de la IA.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={confirmDelete}
                className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                <span>Eliminar permanentemente</span>
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isCategoriaModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setIsCategoriaModalOpen(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-white/20 bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Gestión de Categorías</h3>
                <p className="text-xs font-medium text-slate-500">Agrupan los procesos en el menú del chatbot. No afectan la IA.</p>
              </div>
              <button
                onClick={() => setIsCategoriaModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Crear nueva categoría */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && crearCategoria()}
                placeholder="Nueva categoría…"
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:bg-white"
              />
              <button
                onClick={crearCategoria}
                className="flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Agregar
              </button>
            </div>

            {/* Lista de categorías */}
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
              {categorias.length > 0 ? (
                categorias.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                  >
                    {categoriaEditId === c.id ? (
                      <>
                        <input
                          type="text"
                          value={categoriaEditNombre}
                          onChange={(e) => setCategoriaEditNombre(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && guardarEdicionCategoria(c.id)}
                          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500"
                        />
                        <button
                          onClick={() => guardarEdicionCategoria(c.id)}
                          title="Guardar"
                          className="rounded-lg border border-emerald-100 bg-white p-2 text-emerald-600 transition hover:bg-emerald-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setCategoriaEditId(null); setCategoriaEditNombre('') }}
                          title="Cancelar"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm font-semibold text-slate-700">{c.nombre}</span>
                        <button
                          onClick={() => { setCategoriaEditId(c.id); setCategoriaEditNombre(c.nombre) }}
                          title="Editar"
                          className="rounded-lg border border-slate-100 bg-white p-2 text-slate-500 transition hover:border-sky-200 hover:text-sky-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => eliminarCategoria(c)}
                          title="Eliminar"
                          className="rounded-lg border border-red-50 bg-white p-2 text-red-300 transition hover:border-red-200 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
                  No hay categorías. Crea la primera arriba.
                </div>
              )}
            </div>

            <p className="mt-4 text-[11px] text-slate-400">
              Al eliminar una categoría, sus procesos quedan sin categoría (aparecen en “Otros procesos” en el chat).
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

export default AdminDocuments
