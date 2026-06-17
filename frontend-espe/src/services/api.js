import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authService = {
  async login(username, password) {
    const response = await api.post('/api/auth/login', { username, password })
    return response.data
  },
}

export const chatService = {
  async sendMessage(pregunta, codigoProceso) {
    try {
      const response = await api.post('/api/chat', {
        pregunta,
        codigo_proceso: codigoProceso,
      })
      return response.data
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      throw error
    }
  },
}

export const documentService = {
  async searchDocuments(pregunta) {
    try {
      const response = await api.post('/documents/search', {
        pregunta,
      })
      return response.data
    } catch (error) {
      console.error('Error buscando documentos:', error)
      throw error
    }
  },
}

export const userService = {
  async listUsers() {
    const response = await api.get('/api/users')
    return response.data
  },
  async getUser(userId) {
    const response = await api.get(`/api/users/${userId}`)
    return response.data
  },
  async createUser(payload) {
    const response = await api.post('/api/users', payload)
    return response.data
  },
  async updateUser(userId, payload) {
    const response = await api.put(`/api/users/${userId}`, payload)
    return response.data
  },
  async deleteUser(userId) {
    await api.delete(`/api/users/${userId}`)
  },
}

export const procesoService = {
  async listProcesos() {
    const response = await api.get('/api/procesos')
    return response.data
  },
  async listHistorial(codigo) {
    const response = await api.get(`/api/procesos/${codigo}/historial`)
    return response.data
  },
  async createProceso(payload) {
    const response = await api.post('/api/procesos', payload)
    return response.data
  },
  async updateProceso(codigo, payload) {
    const response = await api.put(`/api/procesos/${codigo}`, payload)
    return response.data
  },
  async deleteProceso(codigo) {
    const response = await api.delete(`/api/procesos/${codigo}`)
    return response.data
  },
  async rollbackProceso(codigo) {
    const response = await api.post(`/api/procesos/${codigo}/rollback`)
    return response.data
  },
  async uploadAnexo(file) {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/api/formatos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

export const calendarService = {
  async listarPeriodos() {
    const response = await api.get('/api/calendarios')
    return response.data
  },
  async getPeriodo(id) {
    const response = await api.get(`/api/calendarios/${id}`)
    return response.data
  },
  async crearPeriodo(payload) {
    const response = await api.post('/api/calendarios', payload)
    return response.data
  },
  async actualizarPeriodo(id, payload) {
    const response = await api.put(`/api/calendarios/${id}`, payload)
    return response.data
  },
  async eliminarPeriodo(id) {
    await api.delete(`/api/calendarios/${id}`)
  },
}

export const categoriaService = {
  async listar() {
    const response = await api.get('/api/categorias')
    return response.data
  },
  async crear(payload) {
    const response = await api.post('/api/categorias', payload)
    return response.data
  },
  async actualizar(id, payload) {
    const response = await api.put(`/api/categorias/${id}`, payload)
    return response.data
  },
  async eliminar(id) {
    await api.delete(`/api/categorias/${id}`)
  },
}

export const configService = {
  async getCorreoSoporte() {
    const response = await api.get('/api/config/correo_soporte')
    return response.data
  },
  async setCorreoSoporte(correo) {
    const response = await api.put('/api/config/correo_soporte', { correo })
    return response.data
  },
  async getTelefonoSoporte() {
    const response = await api.get('/api/config/telefono_soporte')
    return response.data
  },
  async setTelefonoSoporte(telefono) {
    const response = await api.put('/api/config/telefono_soporte', { telefono })
    return response.data
  },
}

export default api
