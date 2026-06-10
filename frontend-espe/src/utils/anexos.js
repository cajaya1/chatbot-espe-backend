const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Deriva el nombre legible quitando el sufijo UUID (_xxxxxxxx) que el backend
// añade a los archivos subidos. Los formatos del seed no tienen sufijo, así que
// la regex no los altera.
export const getAnexoDisplayName = (ruta) => {
  const filename = (ruta || '').split('/').pop() || ''
  return filename.replace(/_[a-f0-9]{8}(\.[^.]+)$/i, '$1')
}

// Descarga el anexo según su origen:
// - /uploads/...  → archivo subido desde el admin, vive en el backend; se usa el
//   endpoint de descarga que fuerza Content-Disposition con el nombre limpio.
// - /formatos/... → formato original del seed, vive en public/ del frontend;
//   se descarga directamente del mismo origen (el atributo download sí aplica).
export const downloadAnexo = (ruta) => {
  if (!ruta) return
  if (ruta.startsWith('/uploads/')) {
    const filename = ruta.split('/').pop()
    window.open(`${API_BASE}/api/formatos/download/${encodeURIComponent(filename)}`, '_blank', 'noopener')
  } else {
    const link = document.createElement('a')
    link.href = ruta
    link.download = ruta.split('/').pop()
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
