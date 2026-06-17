import { Send, MessageCircleMore, Trash2, Loader, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { chatService, procesoService } from '../services/api'
import toast from 'react-hot-toast'
import { downloadAnexo } from '../utils/anexos'
import { useChat } from '../context/ChatContext'
import ChatbotLogo from '../assets/chatbot-logo.jpeg'

// Nombre del asistente. Centralizado aquí porque aún no está definido de forma
// final: cambiar este valor actualiza el saludo, el encabezado y la burbuja.
const BOT_NAME = 'Eva'

// Función auxiliar para parsear links de Markdown (reutilizada de Chatbot.jsx)
const renderFuente = (fuenteString) => {
  const match = fuenteString.match(/\[(.*?)\]\((.*?)\)/);
  if (match) {
    const url = match[2]
    if (url.startsWith('/uploads/') || url.startsWith('/formatos/')) {
      return (
        <button
          type="button"
          onClick={() => downloadAnexo(url)}
          className="text-sky-600 hover:text-sky-800 underline transition-colors"
        >
          {match[1]}
        </button>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-600 hover:text-sky-800 underline transition-colors"
      >
        {match[1]}
      </a>
    );
  }
  return fuenteString;
};

function FloatingChat() {
  const { isChatOpen, toggleChat, closeChat } = useChat()
  const welcomeMessage = `Hola 👋 Soy ${BOT_NAME}, tu asistente virtual académico. ¿En qué proceso puedo ayudarte hoy?`

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: welcomeMessage,
      showOptions: true
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [procesos, setProcesos] = useState([])
  const [procesosLoading, setProcesosLoading] = useState(true)
  const [selectedProceso, setSelectedProceso] = useState(null)
  const [showBubble, setShowBubble] = useState(true)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, loading, isChatOpen])

  useEffect(() => {
    const fetchProcesos = async () => {
      setProcesosLoading(true)
      try {
        const data = await procesoService.listProcesos()
        setProcesos(data)
      } catch (error) {
        console.error('Error fetching procesos:', error)
      } finally {
        setProcesosLoading(false)
      }
    }
    fetchProcesos()
  }, [])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMessage = input.trim()
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput('')
    setLoading(true)

    try {
      const response = await chatService.sendMessage(userMessage, selectedProceso?.codigo_proceso)
      if (response.codigo_proceso && (!selectedProceso || selectedProceso.codigo_proceso !== response.codigo_proceso)) {
        setSelectedProceso({
          codigo_proceso: response.codigo_proceso,
          titulo: response.titulo_proceso
        })
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.respuesta,
        fuentes: response.fuentes,
        showOptions: response.sugerir_procesos
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Error al conectar con el servidor.'
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([{ role: 'assistant', content: welcomeMessage, showOptions: true }])
    setSelectedProceso(null)
    toast.success('Conversación reiniciada')
  }

  const handleSelectProceso = (proceso) => {
    setSelectedProceso(proceso)
    const pasos = (proceso.flujo_pasos || []).map((p, index) => `${index + 1}. ${p}`).join('\n')
    const contenido = `Has seleccionado el proceso de ${proceso.titulo}.\n\nPasos generales:\n${pasos}\n\n¿Tienes alguna duda específica sobre este proceso?`
    setMessages((prev) => [...prev, { role: 'assistant', content: contenido }])
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Ventana de Chat */}
      {isChatOpen && (
        <div className="mb-4 flex h-[600px] w-[90vw] max-w-[400px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <header className="flex items-center justify-between bg-sky-700 px-6 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white">
                  <img src={ChatbotLogo} alt={BOT_NAME} className="h-full w-full object-cover" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sky-700 bg-green-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold">{BOT_NAME} - Asistente Virtual</h3>
                <p className="text-[10px] opacity-80 uppercase tracking-wider font-medium">En línea</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className=" rounded-lg p-2 hover:bg-white/10 transition-colors"
                title="Limpiar chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={closeChat}
                className="rounded-lg p-2 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-4">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex w-full items-end gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar del Bot o Usuario */}
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-white shadow-sm ring-2 ring-white transition-all ${
                  m.role === 'user'
                    ? 'bg-slate-800'
                    : 'bg-white'
                }`}>
                  {m.role === 'user' ? (
                    <MessageCircleMore className="h-4 w-4" />
                  ) : (
                    <img src={ChatbotLogo} alt={BOT_NAME} className="h-full w-full object-cover" />
                  )}
                </div>

                <div className={`group relative max-w-[80%] space-y-2`}>
                  <div className={`rounded-2xl px-3 py-2 text-sm shadow-sm transition-all ${
                    m.role === 'user'
                      ? 'bg-sky-700 text-white rounded-br-none'
                      : 'bg-white text-slate-700 border border-slate-100 rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-line leading-relaxed">{m.content}</p>

                    {m.showOptions && (
                      <div className="mt-3 grid gap-1">
                        <p className={`text-[10px] font-bold uppercase mb-1 ${m.role === 'user' ? 'text-sky-200' : 'text-slate-400'}`}>
                          Selecciona un proceso:
                        </p>
                        {procesosLoading ? (
                          <Loader className="h-3 w-3 animate-spin text-sky-600" />
                        ) : (
                          procesos.map((p) => (
                            <button
                              key={p.codigo_proceso}
                              onClick={() => handleSelectProceso(p)}
                              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold text-slate-600 transition-all hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 active:scale-95"
                            >
                              {p.titulo}
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {m.fuentes && m.fuentes.length > 0 && (
                      <div className={`mt-3 pt-3 border-t text-[11px] ${m.role === 'user' ? 'border-sky-600/50 text-sky-100' : 'border-slate-100 text-slate-500'}`}>
                        <p className="font-bold mb-1 opacity-80 uppercase tracking-tighter">Fuentes Institucionales:</p>
                        {m.fuentes.map((f, i) => (
                          <div key={i} className="flex gap-2 items-start mt-1">
                            <span className="text-sky-500 font-bold">•</span>
                            <div className="flex-1 italic">{renderFuente(f)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex w-full items-end gap-2 flex-row">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-2 ring-white">
                  <img src={ChatbotLogo} alt={BOT_NAME} className="h-full w-full object-cover" />
                </div>
                <div className="max-w-[75%] rounded-2xl bg-white border border-slate-100 px-4 py-3 text-sm text-slate-500 rounded-bl-none flex items-center gap-3 shadow-sm italic">
                  <Loader className="h-4 w-4 animate-spin text-sky-600" />
                  {BOT_NAME} está escribiendo...
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <footer className="border-t border-slate-100 bg-white p-4">
             {selectedProceso && (
              <div className="mb-2 flex items-center justify-between rounded-lg bg-sky-50 px-3 py-1 border border-sky-100">
                <span className="text-[9px] font-bold text-sky-700 uppercase truncate">Consultando: {selectedProceso.titulo}</span>
                <button onClick={() => setSelectedProceso(null)} className="text-sky-400 hover:text-sky-600">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={selectedProceso ? "Escribe tu duda..." : "Selecciona un proceso arriba..."}
                disabled={loading || !selectedProceso}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-3 pl-4 pr-10 text-sm focus:border-sky-500 focus:outline-none disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading || !selectedProceso}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-700 text-white transition hover:bg-sky-800 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </footer>
        </div>
      )}

      {/* Burbuja de notificación + Botón Flotante (FAB) */}
      <div className="flex items-end gap-3">
        {!isChatOpen && showBubble && (
          <div className="relative mb-2 max-w-[230px] rounded-2xl rounded-br-md bg-white px-4 py-3 text-sm text-slate-700 shadow-2xl ring-1 ring-slate-100 animate-in fade-in slide-in-from-right-2 duration-300">
            <button
              type="button"
              onClick={() => setShowBubble(false)}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-white shadow-md transition hover:bg-slate-800"
              aria-label="Cerrar notificación"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="leading-snug">
              ¡Hola! Soy <span className="font-bold text-sky-700">{BOT_NAME}</span>. ¿Tienes algún proceso con el que necesites ayuda?
            </p>
          </div>
        )}

        <button
          onClick={toggleChat}
          className={`relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
            isChatOpen ? 'bg-slate-800' : 'bg-white ring-2 ring-sky-500/30'
          }`}
          aria-label="Abrir asistente virtual"
        >
          {isChatOpen ? (
            <X className="h-10 w-10 text-white" />
          ) : (
            <>
              <img src={ChatbotLogo} alt={BOT_NAME} className="h-full w-full object-cover" />
              <span className="absolute right-1 top-1 h-4 w-4 rounded-full border-2 border-white bg-green-500" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default FloatingChat
