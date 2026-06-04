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
}

export default api
