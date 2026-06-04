import { BookText, Clock3, Mail, MapPin, ShieldCheck } from 'lucide-react'

const informationItems = [
  { title: 'Atención académica', text: 'Consulta procesos oficiales, guías y anexos institucionales.', icon: BookText },
  { title: 'Disponibilidad', text: 'Asistencia virtual pública para usuarios sin inicio de sesión.', icon: Clock3 },
  { title: 'Canal institucional', text: 'Plataforma alineada al Departamento de Ciencias de la Computación.', icon: ShieldCheck },
  { title: 'Contacto', text: 'Integración con correos y puntos de atención académica.', icon: Mail },
]

function Information() {
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">Información</p>
        <h2 className="mt-3 text-2xl font-semibold text-slate-900">Portal académico institucional ESPE</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Este sitio público organiza la ayuda académica para TI en Línea y separa claramente la experiencia del usuario general del acceso administrativo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {informationItems.map((item) => {
          const Icon = item.icon

          return (
            <article key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white p-3 text-sky-700 shadow-sm">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Enfoque de la plataforma</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Información pública, chatbot académico y acceso administrativo claramente diferenciados para mantener una experiencia universitaria limpia, profesional y escalable.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Information