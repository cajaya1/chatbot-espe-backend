import { ArrowRight, BookOpen, BookOpenCheck, BookOpenText, CircleDollarSign, FileText, GraduationCap, MessageSquareText, RefreshCcw, School, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useChat } from '../context/ChatContext'

function Processes() {
	const { openChat } = useChat()
	const processes = [
		{
			title: 'Retiro voluntario',
			description: 'Proceso para suspender estudios de forma regular, con revisión de requisitos y fechas.',
			icon: RefreshCcw,
		},
		{
			title: 'Retiro caso fortuito y/o fuerza mayor',
			description: 'Aplica cuando existe una justificación extraordinaria que debe ser evaluada por la institución.',
			icon: ShieldCheck,
		},
		{
			title: 'Reconocimiento y/o homologación',
			description: 'Consulta equivalencias, validación de asignaturas y documentos que respaldan el proceso.',
			icon: BookOpen,
		},
		{
			title: 'Cambio universidad/carrera/modalidad',
			description: 'Orientación general para solicitudes de cambio de programa, institución o modalidad de estudio.',
			icon: GraduationCap,
		},
		{
			title: 'Legalización de documentos',
			description: 'Información básica para validar, certificar o legalizar documentos académicos.',
			icon: FileText,
		},
		{
			title: 'Reingreso',
			description: 'Proceso para retomar estudios después de una interrupción, sujeto a condiciones académicas.',
			icon: School,
		},
		{
			title: 'Autorización de entrega de trabajos y/o evaluaciones atrasadas',
			description: 'Guía para solicitar revisión o permiso de entrega fuera de plazo, según el caso.',
			icon: MessageSquareText,
		},
		{
			title: 'Recalificación evaluaciones',
			description: 'Proceso orientado a la revisión de calificaciones o evaluaciones cuando exista sustento.',
			icon: BookOpenCheck,
		},
	]

	return (
		<section className="space-y-6">
			<div>
				<p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-700">
					Procesos académicos
				</p>
				<h2 className="mt-3 text-2xl font-semibold text-slate-900">Ruta de Atención Institucional</h2>
				<p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
					Aquí tienes una vista general de los 8 procesos principales con orientación breve para ubicar rápidamente el proceso que necesitas.
				</p>
			</div>

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
				{processes.map((process) => {
					const Icon = process.icon

					return (
						<article key={process.title} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-6">
							<div className="flex items-start gap-4">
								<div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
									<Icon className="h-5 w-5" />
								</div>
								<div className="min-w-0 flex-1">
									<h3 className="text-lg font-semibold text-slate-900">{process.title}</h3>
									<p className="mt-2 text-sm leading-6 text-slate-600">{process.description}</p>
								</div>
							</div>
							<button 
								onClick={openChat}
								className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-800"
							>
								Consultar proceso
								<ArrowRight className="h-4 w-4" />
							</button>
						</article>
					)
				})}
			</div>
		</section>
	)
}

export default Processes
