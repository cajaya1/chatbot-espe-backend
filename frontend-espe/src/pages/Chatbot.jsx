import { Bot, Send, Sparkles, MessageCircleMore, Info, Trash2, Loader, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { chatService, procesoService } from '../services/api'
import toast from 'react-hot-toast'



// Función auxiliar para parsear links de Markdown a elementos <a> de React
const renderFuente = (fuenteString) => {
  // Busca el patrón [Texto del enlace](URL del enlace)
  const match = fuenteString.match(/\[(.*?)\]\((.*?)\)/);
  if (match) {
    return (
      <a
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-600 hover:text-sky-800 underline transition-colors"
      >
        {match[1]}
      </a>
    );
  }
  // Si no es un link Markdown, retorna el texto normal
  return fuenteString;
};

function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hola 👋 Soy el asistente virtual académico de TI en Línea ESPE. ¿En qué trámite puedo ayudarte hoy?',
      showOptions: true
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [procesos, setProcesos] = useState([])
  const [procesosLoading, setProcesosLoading] = useState(true)
  const [selectedProceso, setSelectedProceso] = useState(null)
  const [chatMode, setChatMode] = useState('chat')
  const scrollRef = useRef(null)

  // SCROLL AUTOMÁTICO LOCAL AL CHAT
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [messages, loading])

  const suggestedQuestions = procesos.map((item) => item.titulo)

  useEffect(() => {
    const fetchProcesos = async () => {
      setProcesosLoading(true)
      try {
        const data = await procesoService.listProcesos()
        setProcesos(data)
      } catch (error) {
        const message = error.response?.data?.detail || 'No se pudieron cargar los procesos vigentes'
        toast.error(message)
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
      
      // Si el backend descubrió un proceso que no teníamos seleccionado
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
        showOptions: response.sugerir_procesos // Muestra la lista si el backend lo indica
      }])
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error al conectar con el servidor. Por favor, intenta más tarde.'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }])
      toast.error('Error al enviar el mensaje')
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hola 👋 Soy el asistente virtual académico de TI en Línea ESPE. ¿En qué trámite puedo ayudarte hoy?',
        showOptions: true
      }
    ])
    setSelectedProceso(null)
    setChatMode('chat')
    toast.success('Conversación reiniciada')
  }

  const handleSuggestedQuestion = (question) => {
    setInput(question)
  }

  const handleSelectProceso = (proceso) => {
    setSelectedProceso(proceso)
    const pasos = (proceso.flujo_pasos || []).map((p, index) => `${index + 1}. ${p}`).join('\n')
    const contenido = `Has seleccionado el proceso de ${proceso.titulo}.\n\nPasos generales:\n${pasos}\n\n¿Tienes alguna duda específica sobre este trámite?`
    setMessages((prev) => [...prev, { role: 'assistant', content: contenido }])
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex h-[calc(100vh-200px)] min-h-[600px] gap-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">

        {/* Sidebar de Información */}
        <aside className="hidden w-80 flex-col border-r border-slate-100 bg-slate-50/50 p-6 lg:flex">
          <div className="flex items-center gap-3 text-sky-700">
            <Info className="h-5 w-5" />
            <h2 className="font-bold uppercase tracking-wider text-xs">Información</h2>
          </div>

          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Asistente ITI</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Especializado en el Reglamento de Régimen Académico y procesos internos de la carrera ITI.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Preguntas Sugeridas</h3>
              <div className="mt-3 flex flex-col gap-2">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSuggestedQuestion(q)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-left text-xs text-slate-600 transition hover:bg-sky-50 hover:text-sky-700 hover:border-sky-100"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-sky-700 p-4 text-white shadow-lg shadow-sky-200">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-300" />
                <span className="text-xs font-bold uppercase">Tips de uso</span>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-sky-100">
                Sé específico con los nombres de los trámites para obtener mejores respuestas.
              </p>
            </div>
          </div>

          <div className="mt-auto">
            <button
              onClick={handleClearChat}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100"
            >
              <Trash2 className="h-4 w-4" />
              Limpiar Conversación
            </button>
          </div>
        </aside>

        {/* Área del Chat */}
        <main className="flex flex-1 flex-col">
          {/* Header del Chat */}
          <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Asistente Virtual ESPE</h1>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-medium text-slate-500 uppercase">En línea</span>
                </div>
              </div>
            </div>
          </header>

          {/* Mensajes */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-slate-50/30 p-6 space-y-6"
          >
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white ${m.role === 'user' ? 'bg-slate-800' : 'bg-sky-700'}`}>
                    {m.role === 'user' ? <MessageCircleMore className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm whitespace-pre-line ${m.role === 'user'
                      ? 'bg-sky-700 text-white rounded-tr-none'
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                    }`}>
                    {m.content}

                    {/* Opciones de procesos integradas en el chat */}
                    {m.showOptions && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-1">
                        {procesosLoading ? (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Loader className="h-3 w-3 animate-spin" />
                            Cargando procesos...
                          </div>
                        ) : (
                          procesos.map((p) => (
                            <button
                              key={p.codigo_proceso}
                              onClick={() => handleSelectProceso(p)}
                              className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-left text-xs font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                            >
                              {p.titulo}
                            </button>
                          ))
                        )}
                      </div>
                    )}

                    {/* Renderizado dinámico de las fuentes */}
                    {m.fuentes && m.fuentes.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                        <p className="font-semibold mb-1 text-slate-600">Fuentes institucionales:</p>
                        <ul className="flex flex-col gap-1 list-none pl-0">
                          {m.fuentes.map((fuente, i) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-1.5 text-sky-500">•</span>
                              <span>{renderFuente(fuente)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%] items-start gap-3">
                  <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white bg-sky-700">
                    <Loader className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm bg-white text-slate-700 border border-slate-100 rounded-tl-none">
                    Consultando el reglamento institucional...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer del Chat (Input) */}
          <footer className="border-t border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-3">
              {selectedProceso && (
                <div className="flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 border border-sky-100">
                  <span className="text-[10px] font-bold text-sky-700 uppercase">Consultando: {selectedProceso.titulo}</span>
                  <button 
                    onClick={() => {
                      setSelectedProceso(null);
                      setMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: 'He quitado el filtro de trámite. ¿En qué otro proceso te puedo ayudar?',
                        showOptions: true 
                      }]);
                    }}
                    className="text-sky-400 hover:text-sky-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
                placeholder="Escribe tu duda académica o selecciona un trámite..."
                disabled={loading}
                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-6 pr-14 text-sm text-slate-700 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all placeholder:text-slate-400 disabled:bg-slate-100"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="absolute right-2 top-2 h-10 w-10 flex items-center justify-center rounded-xl bg-sky-700 text-white transition hover:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-sky-200"
              >
                {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-3 text-center text-[10px] text-slate-400">
              Presiona Enter para enviar. Puedes preguntar libremente y el asistente identificará el proceso automáticamente.
            </p>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default Chatbot