import { useState } from 'react'
import { Download, FileText, Search, FileCheck, FileClock, ClipboardList } from 'lucide-react'

function Formats() {
  const [searchTerm, setSearchTerm] = useState('')

  const items = [
    { title: 'Solicitud de Retiro Voluntario', category: 'Retiros', size: '156 KB', icon: FileText, fileName: 'Anexo_Retiro_Voluntario.docx.DOCX' },
    { title: 'Retiro por Caso Fortuito / Fuerza Mayor', category: 'Retiros', size: '142 KB', icon: FileClock, fileName: 'Anexo_Retiro_Fuerza_Mayor.DOCX' },
    { title: 'Reconocimiento y Homologación', category: 'Académico', size: '210 KB', icon: FileCheck, fileName: 'Anexo_Homologacion.docx' },
    { title: 'Cambio de Carrera / Universidad', category: 'Movilidad', size: '188 KB', icon: ClipboardList, fileName: 'Anexo_Cambio_Carrera.docx' },
    { title: 'Legalización de Documentos Académicos', category: 'Trámites', size: '125 KB', icon: FileText, fileName: 'Anexo_Legalizacion.docx' },
    { title: 'Solicitud de Reingreso', category: 'Académico', size: '140 KB', icon: FileClock, fileName: 'Anexo_Reingreso.docx' },
    { title: 'Entrega de Trabajos Atrasados', category: 'Académico', size: '98 KB', icon: ClipboardList, fileName: 'Anexo_Trabajos_Atrasados.docx' },
    { title: 'Recalificación de Evaluaciones', category: 'Evaluación', size: '112 KB', icon: FileCheck, fileName: 'Anexo_Recalificacion.docx' },
  ]

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDownload = (fileName) => {
    const link = document.createElement('a')
    link.href = `/formatos/${fileName}`
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-8 py-16 text-white shadow-2xl lg:px-16">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-sky-500 blur-3xl" />
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-green-500 blur-3xl" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
          <p className="text-sm font-semibold uppercase tracking-widest text-sky-400">Centro de Descargas</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Formatos y Anexos Oficiales</h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            Encuentre y descargue toda la documentación oficial necesaria para sus trámites académicos en la Carrera ITIV.
          </p>
          
          <div className="mt-10 flex w-full max-w-md items-center rounded-2xl bg-white/10 p-2 backdrop-blur-md border border-white/20">
            <Search className="ml-4 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar documento..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent px-4 py-2 text-sm text-white focus:outline-none placeholder:text-slate-400" 
            />
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredItems.map((item, idx) => {
          const Icon = item.icon
          return (
            <article 
              key={idx} 
              className="group flex flex-col rounded-3xl border border-slate-100 bg-white p-6 transition-all hover:border-sky-100 hover:shadow-xl hover:shadow-sky-500/5"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-600 transition group-hover:bg-sky-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-sky-200">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100/50">
                  {item.category}
                </span>
              </div>
              
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition leading-snug">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-slate-400">Tamaño: {item.size}</p>
              </div>

              <button 
                onClick={() => handleDownload(item.fileName)}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                <Download className="h-4 w-4" />
                Descargar Formato
              </button>
            </article>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="mt-16 text-center">
          <p className="text-slate-500">No se encontraron documentos que coincidan con tu búsqueda.</p>
        </div>
      )}

      {/* Info Section */}
      <div className="mt-20 rounded-3xl border border-slate-200 bg-slate-50 p-8 text-center sm:p-12">
        <h2 className="text-xl font-bold text-slate-900">¿No encuentras lo que buscas?</h2>
        <p className="mt-4 text-slate-600">
          Si necesitas un formato que no figura en esta lista, por favor consulta con secretaría o usa el asistente virtual.
        </p>
      </div>
    </div>
  )
}

export default Formats
