import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.models.proceso_academico import ProcesoAcademico
from app.models.categoria import Categoria, ProcesoCategoria
from app.models.calendario_academico import PeriodoAcademico, ActividadCalendario
from app.schema.user_schema import UserCreate
from app.services.chroma_service import upsert_contexto_proceso
from app.core.utils import generate_next_codigo_proceso
from app.services.user_service import create_user, get_user_by_username


def seed_users(db: Session) -> None:
    default_users = [
        {"username": "cajaya1", "password": "cajaya1", "role": "editor"},
        {"username": "mvmaldonado", "password": "mvmaldonado", "role": "editor"},
        {"username": "admin", "password": "admin", "role": "admin"},
    ]

    for data in default_users:
        if get_user_by_username(db, data["username"]):
            continue
        create_user(db, UserCreate(**data))


def seed_procesos(db: Session) -> None:
    procesos_data = [
        {
            "codigo_proceso": "PROC-01",
            "titulo": "Retiro Voluntario",
            "flujo_pasos": [
                "Remitir la solicitud formal de retiro voluntario dirigida al Director de Carrera, dentro del término máximo de cinco (5) días contados a partir de la fecha de inicio de clases conforme al calendario académico vigente.",
                "Adjuntar a la solicitud la factura que acredite el pago del rubro por concepto de trámite administrativo de retiro voluntario.",
                "El Director de Carrera verificará que la solicitud se encuentre dentro del término legal establecido y, de ser procedente, autorizará y remitirá el trámite a la Unidad de Registro para su registro en el sistema académico con la observación RETIRO/VOLUNTARIO.",
                "La Unidad de Registro procederá al guardado y grabación de la matrícula en el sistema académico para el recálculo de valores correspondientes a pérdida de gratuidad.",
                "En caso de generarse valores a pagar por concepto de pérdida de gratuidad, se notificará al estudiante para su cancelación y a la Unidad Financiera para el inicio del proceso de recaudación o la generación del impedimento económico correspondiente.",
            ],
            "contexto_legal": (
                "Artículo 189. Retiro de asignaturas, cursos, módulos o sus equivalentes. - Un estudiante de tercer nivel de formación, podrá retirarse acogiéndose a los siguientes tipos de retiro:\n\n"
                "a. Retiro Voluntario: En un período académico, en el término máximo de cinco (5) días contados a partir de la fecha de inicio de clases según el calendario académico, el estudiante podrá solicitar el retiro voluntario de una, algunas o todas las asignaturas, cursos, módulos o sus equivalentes al Director de Carrera, adjuntando la factura del pago correspondiente al rubro por concepto para trámite administrativo de retiro voluntario. El Director de Carrera una vez verifique que la solicitud se encuentre dentro del término establecido, autorizará y remitirá a la Unidad de Registro para el registro en el sistema académico con la observación RETIRO/VOLUNTARIO y se guardará/grabará la matrícula en el sistema académico para el recálculo de valores correspondientes a pérdida de gratuidad; en el caso de que se generen valores a pagar por este concepto, se notificará de este particular al estudiante para su pago y a la Unidad Financiera para que realice el proceso de recaudación de valores o generación e implantación del impedimento económico. Posteriormente, se archivará la documentación de respaldo en el expediente académico del estudiante. Si el estudiante solicita el retiro voluntario en la segunda lengua, su solicitud deberá estar dirigida a la dirección de la dependencia encargada de ejecutar los cursos de idiomas en la Universidad, cumpliendo el proceso establecido en el presente literal.\n\n"
                "El Director de Carrera o el Director de la dependencia encargada de ejecutar los cursos de idiomas en la Universidad, según corresponda, negará la solicitud de retiro voluntario y notificará de inmediato al estudiante cuando:\n"
                "- El estudiante presente su solicitud fuera del término de cinco (5) días contados a partir de la fecha de inicio de clases; o,\n"
                "- Se trate de asignaturas, cursos, módulos o sus equivalentes en los que se haya matriculado con tercera matrícula.\n\n"
                "Si se autorizare el retiro voluntario de una, algunas o todas las asignaturas, cursos, módulos o sus equivalentes, la matrícula correspondiente quedará sin efecto, y no se contabilizará para la aplicación de lo establecido en la Ley Orgánica de Educación Superior y en el presente reglamento, referentes a las terceras matrículas; tampoco se considerará para el cálculo del promedio general del estudiante.\n\n"
                "Las asignaturas, cursos, módulos o sus equivalentes motivo del retiro no se eliminarán de la historia académica del estudiante, ni se devolverán los valores previamente generados y/o cancelados, por concepto de pérdida de gratuidad."
            ),
            "ruta_anexo": "/formatos/Anexo_Retiro_Voluntario.docx",
        },
        {
            "codigo_proceso": "PROC-02",
            "titulo": "Retiro por Caso Fortuito o Fuerza Mayor",
            "flujo_pasos": [
                "Presentar la solicitud de retiro ante el Director de Carrera, acompañada de la documentación de respaldo que sustente la situación fortuita o de fuerza mayor; si se adjuntan certificaciones médicas, estas deberán estar validadas o emitidas por el Sistema Integrado de Salud de la Universidad. Dicha solicitud podrá ser presentada hasta el último día de clases conforme al calendario académico vigente.",
                "El Director de Carrera analizará la documentación presentada y, de requerir verificación de los hechos, solicitará a la Unidad de Bienestar Universitario la emisión del informe pertinente en el término máximo de cinco (5) días.",
                "El Director de Carrera convocará al Consejo de Carrera, en un término no mayor a cinco (5) días contados desde la recepción de la solicitud, para el conocimiento y resolución de la petición, adjuntando toda la documentación de respaldo.",
                "El Consejo de Carrera emitirá su resolución y notificará al estudiante, a la Dirección de Carrera y a la Unidad de Registro mediante la Resolución correspondiente.",
                "La Unidad de Registro, en caso de que la Resolución conceda el retiro, registrará el mismo con la observación RETIRO CASO FORTUITO/FUERZA MAYOR; la matrícula quedará sin efecto y no se contabilizará para terceras matrículas ni para el promedio general del estudiante.",
            ],
            "contexto_legal": (
                "deberá solicitar al Director de Carrera el retiro de una, algunas o todas las asignaturas, cursos, módulos o sus equivalentes en los que se encuentre matriculado en un período académico, adjuntando la documentación de respaldo que sustente su petición; en caso de adjuntar certificaciones médicas, estas deberán estar validadas o emitidas por el Sistema Integrado de Salud de la Universidad. La solicitud de retiro podrá ser presentada hasta el último día de clases previsto en el correspondiente calendario académico. En caso de que el estudiante no pueda realizar ni presentar personalmente la solicitud de retiro, podrá ser presentada por un familiar o un tercero a nombre del estudiante, dejando constancia documentada de la causa por la cual el estudiante no puede pedirlo de manera personal.\n\n"
                "2. El Director de Carrera analizará la documentación presentada por el estudiante, considerando la fecha en la cual ocurrió el evento, y en caso de requerir la verificación de los hechos aseverados por el estudiante, solicitará a la Unidad de Bienestar Universitario elabore y emita el informe pertinente en el término máximo de cinco (5) días, y en caso de ser necesario se deberá coordinar con el Sistema Integrado de Salud de la Universidad, para emitir el informe de manera conjunta.\n\n"
                "3. El Director de Carrera en un término no mayor a cinco (5) días contados a partir de la recepción de la solicitud del estudiante, convocará al Consejo de Carrera para conocimiento y resolución de la solicitud de retiro por situaciones fortuitas o fuerza mayor, adjuntando toda la documentación de respaldo.\n\n"
                "4. El Consejo de Carrera resolverá y notificará al estudiante, la Dirección de Carrera y la Unidad de Registro, con la Resolución correspondiente.\n\n"
                "5. La Unidad de Registro, en caso que la Resolución conceda el retiro, registrará el mismo con la observación RETIRO CASO FORTUITO/FUERZA MAYOR.\n\n"
                "6. La resolución y la documentación de respaldo se archivará en el expediente académico del estudiante.\n\n"
                "En el retiro por situaciones fortuitas o de fuerza mayor de una, algunas o todas las asignaturas, cursos, módulos o sus equivalentes, la matrícula correspondiente quedará sin efecto, y no se contabilizará para la aplicación de lo establecido en la Ley Orgánica de Educación Superior y en el presente reglamento, referentes a las terceras matrículas; tampoco se considerará para el cálculo del promedio general del estudiante. En este caso procederá la devolución de valores previamente generados y/o cancelados, por concepto de pérdida de gratuidad.\n\n"
                "Para los tipos de retiro que constan en los literales a y b del presente artículo, los estudiantes militares de planta en segunda carrera de tercer nivel deberán anexar a su solicitud la autorización del Comando de la respectiva Fuerza a la que pertenecen.\n\n"
                "Para los estudiantes de la modalidad Dual, el retiro voluntario y el retiro por situaciones fortuitas o de fuerza mayor, descritos en el presente artículo, que impidan al estudiante la culminación del período académico, se tramitarán previamente y conforme lo establecido en la normativa de las Entidades formadoras receptoras, las que deberán informar a la Universidad para el registro respectivo.\n\n"
                "Para los tipos de retiro que constan en los literales a y b del presente artículo, si el estudiante se retira de todas las asignaturas o equivalentes en las que se encontraba matriculado, se le colocará el estatus (atributo) de INACTIVO; esta condición cambiará cuando solicite el reingreso al Director de Carrera, quien lo autorizará, siempre que el estudiante cumpla los requisitos establecidos en este reglamento."
            ),
            "ruta_anexo": "/formatos/Anexo_Retiro_Fuerza_Mayor.docx",
        },
        {
            "codigo_proceso": "PROC-03",
            "titulo": "Reconocimiento y Homologación de Asignaturas",
            "flujo_pasos": [
                "Verificar que el contenido, profundidad y número de horas de la asignatura a homologar sean al menos equivalentes al ochenta por ciento (80%) de la asignatura correspondiente en la Universidad.",
                "Constatar que no hayan transcurrido más de diez (10) años desde la culminación del último período académico en que fue aprobada la asignatura objeto de homologación.",
                "Presentar la solicitud formal de homologación mediante análisis comparativo de contenidos (micro currículo), dirigida a la instancia institucional competente.",
                "Efectuar el pago de los aranceles determinados para este proceso conforme a la normativa interna vigente.",
                "En caso de aprobarse la homologación, el estudiante mantendrá la gratuidad de la educación superior pública, de ser el caso, conforme a la normativa aplicable.",
            ],
            "contexto_legal": (
                "Artículo 217. Homologación. - Es la transferencia de horas académicas o créditos correspondientes a las asignaturas, cursos, módulos o sus equivalentes aprobados, con fines de movilidad interna o entre Instituciones de Educación Superior nacionales e internacionales; para casos de transiciones en procesos de rediseño y/o ajuste curricular cuando corresponda.\n\n"
                "Esta transferencia puede realizarse en carreras del mismo nivel o de un nivel formativo a otro, también podrá aplicarse del nivel de bachillerato hacia la educación superior solo en casos de estudios avanzados con reconocimiento internacional, como por ejemplo: Bachillerato Internacional (BI), Bachillerato Técnico Productivo (BTP), cursos de Advanced Placement (AP), u otros con reconocimiento internacional, conforme a lo establecido en la normativa interna aplicable para el efecto de la Universidad.\n\n"
                "La Universidad deberá verificar que los estudios homologados garanticen la consecución del perfil de egreso, así como los requisitos de titulación contenidos en la resolución de aprobación de la carrera o programa emitida por el Consejo de Educación Superior.\n\n"
                "La Universidad en su normativa interna determinará la equivalencia de las horas académicas y/o créditos, en cualquier nivel de estudios superiores, pudiendo validarse u homologarse hasta la totalidad de la carrera o programas.\n\n"
                "La homologación se podrá realizar mediante análisis comparativo de contenidos, el cual consiste en la transferencia de horas académicas y/o créditos mediante la comparación de contenidos del micro currículo; siempre que el contenido, profundidad y número de horas de la asignatura, curso, módulo o su equivalente, sean al menos equivalentes al ochenta por ciento (80%) de la asignatura, curso, módulo o su equivalente motivo de análisis de homologación en la Universidad.\n\n"
                "La homologación sólo podrá realizarse hasta diez (10) años después de la aprobación de la asignatura, curso, módulo o su equivalente, contados a partir de la culminación del último período académico cursado.\n\n"
                "En todo procedimiento de homologación el solicitante deberá pagar los aranceles determinados para este proceso; de aceptarse la homologación el estudiante mantendrá la gratuidad de la educación superior pública, de ser el caso.\n\n"
                "La homologación de la formación en el entorno laboral real, relacionadas a las horas de prácticas preprofesionales realizadas por el estudiante en otras modalidades o Instituciones de Educación Superior, se sujetará a lo establecido en el Reglamento para las Carreras y Programas en Modalidad de Formación Dual y la normativa interna para el efecto."
            ),
            "ruta_anexo": "/formatos/Anexo_Homologacion.docx",
        },
        {
            "codigo_proceso": "PROC-04",
            "titulo": "Cambio de sede, carrera o IES (Institución de Educación Superior)",
            "flujo_pasos": [
                "Acreditar haber cursado y finalizado al menos un (1) período académico ordinario de la malla curricular en la carrera de origen para cambios internos o de sede, o al menos dos (2) períodos académicos para solicitudes provenientes de otras Instituciones de Educación Superior.",
                "Cumplir con el puntaje mínimo de admisión de cohorte de la carrera receptora correspondiente al período académico en el que se solicita la movilidad.",
                "Tener presente que, si el estudiante se encontraba matriculado por primera vez en asignaturas de primer nivel y se retiró antes de finalizar el período, no podrá solicitar cambio de carrera; deberá solicitar el reingreso a su carrera de origen o iniciar el proceso de admisión conforme a la normativa del sistema de acceso a la educación superior.",
                "Verificar la existencia de cupos disponibles en la carrera receptora para el período académico correspondiente.",
                "Considerar que, en lo referente a la gratuidad de la educación superior pública, el cambio de carrera o de sede podrá realizarse por una sola vez.",
            ],
            "contexto_legal": (
                "Artículo 212. Cambio de carrera y cambio de Institución de Educación Superior. - Estarán sujetos a lo establecido en la normativa interna emitida para el efecto y se podrán realizar bajo las siguientes reglas:\n\n"
                "a. Cambio de carrera al interior de la Universidad: Procede cuando el estudiante haya cursado y finalizado al menos un período académico ordinario de la malla curricular de su carrera de origen; adicionalmente deberá cumplir con el puntaje mínimo de admisión de cohorte de la carrera receptora en el período académico correspondiente en el cual solicita su movilidad.\n\n"
                "Cuando un estudiante que se encontraba matriculado por primera vez en asignaturas o sus equivalentes de primer nivel en la carrera de origen, se haya retirado de dichas asignaturas o sus equivalentes, antes de la finalización del período académico, no podrá solicitar el cambio de carrera al interior de la Universidad; podrá solicitar el reingreso a su carrera de origen, o iniciar el proceso de admisión cumpliendo lo establecido en la normativa del sistema de acceso a la educación superior.\n\n"
                "b. Cambio de carrera de una Institución de Educación Superior Pública a la Universidad: Procederá el cambio a la misma carrera o a una distinta, en el caso que el estudiante haya cursado y finalizado al menos dos (2) períodos académicos ordinarios de la malla curricular de su carrera de origen y cumpla con el puntaje mínimo de admisión de cohorte de la carrera receptora en el período académico correspondiente en el cual solicita su movilidad.\n\n"
                "c. Cambio de carrera de una IES particular a la Universidad: Procederá el cambio a la misma carrera o a una distinta en el caso que el estudiante haya cursado y finalizado al menos dos (2) períodos académicos ordinarios de la malla curricular de su carrera de origen; haya sido sometido al proceso de asignación de cupos establecido por el Órgano Rector de la Política Pública de Educación Superior; y cumpla con el puntaje mínimo de admisión de cohorte de la carrera receptora en el período académico correspondiente en el cual solicita su movilidad.\n\n"
                "En los tres (3) literales del presente artículo, el cambio estará sujeto además a la existencia de cupos en la carrera receptora en el período académico correspondiente, al cumplimiento de lo establecido en la normativa vigente para el efecto y, para todo lo relacionado a la gratuidad de la educación superior pública se podrá realizar el cambio de carrera por una sola vez.\n\n"
                "Cuando el cambio de carrera amerite el reconocimiento de estudios, se procederá conforme lo establecido en el presente reglamento y demás normativa interna.\n\n"
                "La Unidad de Registro será la responsable de elaborar y/o actualizar la normativa interna y procedimientos necesarios para aplicación de lo establecido en el presente artículo.\n\n"
                "Artículo 213. Cambio a otra sede o a la Matriz en la misma carrera de la Universidad. - Un estudiante podrá cambiarse a otra sede o a la Matriz dentro de la Universidad en la misma carrera, cuando haya cursado al menos un (1) período académico ordinario y deberá cumplir con el puntaje mínimo de admisión de cohorte de la carrera receptora en el período académico correspondiente en el cual solicita su movilidad; el cambio estará sujeto a la existencia de cupos en la carrera receptora en el período académico correspondiente.\n\n"
                "Cuando un estudiante que se encontraba matriculado por primera vez en asignaturas o sus equivalentes de primer nivel en la carrera de origen, se haya retirado de dichas asignaturas o sus equivalentes, antes de la finalización del período académico, no podrá solicitar el cambio a otra sede o a la Matriz en la misma carrera al interior de la Universidad; podrá solicitar el reingreso a su carrera en el lugar de origen, o iniciar el proceso de admisión cumpliendo lo establecido en la normativa del sistema de acceso a la educación superior.\n\n"
                "Cuando el cambio a otra sede o a la Matriz en la misma carrera de la Universidad, amerite el reconocimiento de estudios, se procederá conforme lo establecido en el presente reglamento y demás normativa interna aplicable para el efecto. Para todo lo relacionado a la gratuidad de la educación superior pública se podrá realizar el cambio por una sola vez.\n\n"
                "La Unidad de Registro será la responsable de elaborar y/o actualizar la normativa interna y procedimientos necesarios para aplicación de lo establecido en el presente artículo.\n\n"
                "Artículo 214. Excepción al cambio de carrera. - No se considerará cambio de carrera cuando este sea dentro de un tronco común, para lo cual deberá existir correspondencia entre los campos amplios del conocimiento de las carreras objeto de dicho cambio.\n\n"
                "Se considera tronco común a un conjunto de asignaturas y/o cursos compartidos por múltiples carreras académicas, caracterizados por similitudes en contenidos y objetivos, vinculados a campos amplios del conocimiento. Estas asignaturas, de carácter fundamental, abordan conceptos, habilidades y conocimientos que convergen en resultados de aprendizaje compartidos en las disciplinas académicas respectivas.\n\n"
                "La finalidad del tronco común es proporcionar una base sólida de conocimientos generales y habilidades transferibles aplicables en diversos campos relacionados, enriqueciendo la formación del estudiante. Facilita la movilidad estudiantil al permitir la transferencia de créditos y competencias adquiridas en estas asignaturas comunes."
            ),
            "ruta_anexo": "/formatos/Anexo_Cambio_Carrera.docx",
        },
        {
            "codigo_proceso": "PROC-06",
            "titulo": "Solicitud de Reingreso",
            "flujo_pasos": [
                "Verificar en el récord académico que no hayan transcurrido más de diez (10) años contados a partir de la finalización del último período académico en el que se produjo la interrupción de los estudios.",
                "En caso de que la carrera de destino se encuentre vigente y su plan de estudios o malla curricular hayan sido modificados, se deberá realizar el proceso de reconocimiento de horas y/o créditos conforme a la normativa institucional vigente.",
                "Cuando hayan transcurrido más de diez (10) años desde la interrupción, el reingreso solo podrá efectuarse mediante validación de conocimientos de las asignaturas, cursos, módulos o sus equivalentes aprobados, conforme al reglamento y normativa vigente aplicable.",
                "Si la carrera se encuentra en estado 'no vigente' o 'no vigente habilitado para registro de títulos', se implementará un plan individual para la culminación de los estudios, cursando en una carrera vigente asignaturas afines, las cuales deberán ser objeto de reconocimiento de horas y/o créditos una vez aprobadas.",
            ],
            "contexto_legal": (
                "Artículo 195. Reingreso. – Si un estudiante no ha culminado sus estudios en una carrera, podrá continuar sus estudios en la misma carrera, o en otra carrera, siempre que se encuentren vigentes a la fecha de reingreso. Este trámite se podrá realizar por parte del estudiante, considerando que en ningún caso haya transcurrido más de diez (10) años contados a partir de la finalización del último período académico en el que se produjo la interrupción de sus estudios. Cuando un estudiante requiera reingresar a una carrera vigente, en la que el plan de estudios o malla curricular hayan sido modificados, se deberá realizar el reconocimiento de horas y/o créditos conforme lo establecido en el presente reglamento, para que continúe sus estudios.\n\n"
                "Transcurrido el plazo establecido de diez (10) años, el estudiante podrá retomar sus estudios en la misma carrera, o en otra carrera, siempre que se encuentren vigentes a la fecha de reingreso, mediante validación de conocimientos de asignaturas, cursos, módulos o sus equivalentes, de conformidad con lo establecido en el presente reglamento y demás normativa vigente aplicable al efecto.\n\n"
                "Para la contabilización del plazo establecido, se deberá considerar como fecha de finalización el último día del mes en el que finalizó el período académico en el que se produjo la interrupción de sus estudios; esta información deberá ser obtenida y verificada en el récord académico de la carrera cursada por el estudiante.\n\n"
                "Cuando un estudiante requiera reingresar a una carrera, y esta se encuentre en estado “no vigente” o “no vigente habilitado para registro de títulos”, para garantizar la culminación de sus estudios, podrá realizarlo, siempre y cuando no supere el plazo máximo establecido, y se implemente un plan individual para culminar la carrera, cursando en una carrera vigente, asignaturas o sus equivalentes, las cuales deberán ser afines a las que se encontraba cursando; una vez que las mismas hayan sido aprobadas, se deberá realizar el reconocimiento de horas y/o créditos conforme lo establecido en el presente reglamento.\n\n"
                "El procedimiento con los responsables, requisitos y plazos, para lo establecido en el presente artículo, constarán en la normativa interna creada para el efecto. La Unidad de Registro será la responsable de elaborar o actualizar dicha normativa."
            ),
            "ruta_anexo": "/formatos/Anexo_Reingreso.docx",
        },
        {
            "codigo_proceso": "PROC-07",
            "titulo": "Entrega de evaluaciones/trabajos fuera del plazo límite",
            "flujo_pasos": [
                "Presentar la solicitud debidamente sustentada ante el Director de Carrera, en el término de tres (3) días subsiguientes a la fecha en que se entregó o rindió el instrumento de evaluación.",
                "El Director de Carrera analizará si el justificativo presentado se enmarca dentro de las causales oficiales de justificación de inasistencia establecidas en la normativa institucional.",
                "De verificarse que el justificativo es procedente, el estudiante rendirá el instrumento de evaluación sin disminución de puntos; en caso contrario, se aplicará una rebaja del veinte por ciento (20%) de la calificación a obtener.",
                "El personal académico responsable establecerá y notificará al estudiante la nueva fecha para la recepción o aplicación del instrumento de evaluación.",
                "Si el estudiante no cumple con la nueva fecha fijada por el personal académico, la calificación del instrumento de evaluación será registrada con cero (0).",
            ],
            "contexto_legal": (
                "Artículo 150. Justificación para presentar medios e instrumentos de evaluación fuera de plazo. – Los medios e instrumentos de evaluación se deberán entregar o rendir en las fechas y horas señaladas para el efecto por el personal académico responsable de la asignatura, curso, módulo o su equivalente. Excepción hecha para las causas de justificación de inasistencia, para lo cual se requerirá de la autorización expresa del Director de Carrera o Coordinador de Programa, con base a la solicitud presentada por el estudiante, en el término de tres (3) días subsiguientes a la fecha en que se entregó o rindió el instrumento de evaluación, según corresponda. La solicitud deberá estar debidamente sustentada.\n\n"
                "Para realizar el análisis de justificación para presentar instrumentos de evaluación atrasados, se deberá tomar en cuenta las causales definidas para la justificación de inasistencia; el Director de Carrera o Coordinador de Programa, verificará si el justificativo presentado se enmarca dentro de las causales antes indicadas; de ser así no habrá disminución de puntos, caso contrario, se deberá aplicar una rebaja del veinte por ciento (20%) de la calificación a obtener.\n\n"
                "Con el objetivo de presentar los instrumentos de evaluación no presentados o rendidos, se deberá notificar al estudiante y al personal académico quien establecerá la fecha para la recepción o aplicación del instrumento de evaluación; si el estudiante incumple con la nueva fecha fijada por el personal académico, la calificación del instrumento de evaluación se registrará con cero (0).\n\n"
                "En la nivelación de carreras, también se aplicará lo establecido en el presente artículo, debiendo considerar que la solicitud para presentar medios e instrumentos de evaluación fuera de plazo, debidamente respaldada, deberá ser presentada al Coordinador de nivelación de Carreras."
            ),
            "ruta_anexo": "/formatos/Anexo_Trabajos_Atrasados.docx",
        },
        {
            "codigo_proceso": "PROC-08",
            "titulo": "Solicitud de recalificación de evaluaciones",
            "flujo_pasos": [
                "Presentar la solicitud de recalificación dentro de los plazos establecidos en la normativa institucional, indicando si el instrumento de evaluación se encuentra bajo la custodia del estudiante.",
                "El Director de Carrera, en el término de un (1) día a partir de la recepción de la solicitud, remitirá el instrumento o la solicitud al Director del Departamento correspondiente, requiriendo la designación de dos (2) miembros del personal académico para la recalificación y la entrega de la rúbrica por parte del docente responsable.",
                "El Director de Departamento, en el término máximo de un (1) día, dispondrá al docente responsable la entrega de la rúbrica y del instrumento de evaluación; en un término adicional de un (1) día, designará a los evaluadores y les adjuntará toda la documentación recopilada.",
                "El personal académico designado recalificará el instrumento en el término máximo de dos (2) días y remitirá al Director de Carrera el informe debidamente suscrito con las calificaciones y el promedio obtenido.",
                "Si el promedio de recalificación es mayor a la calificación registrada, el Director de Carrera notificará al docente responsable para la modificación del registro conforme al procedimiento reglamentario; si es menor, se informará al estudiante del resultado y se archivará la documentación sin alteración de la nota original.",
            ],
            "contexto_legal": (
                "Artículo 160. Procedimiento de recalificación de medios e instrumentos de evaluación. - A partir de la recepción de la solicitud de recalificación presentada por el estudiante, siempre que la misma se encuentre dentro de los plazos establecidos para la recalificación, el Director de Carrera o Coordinador de Nivelación, en el término de un (1) día, remitirá el medio o instrumento de evaluación, o únicamente la solicitud en caso de que el pedido de recalificación sea de un medio o instrumento de evaluación rendido de forma oral, al Director del Departamento que corresponda, solicitando:\n\n"
                "a. Designe dos (2) miembros del personal académico del Área de Conocimiento a la que pertenece la asignatura o su equivalente, excluyendo al docente responsable de la asignatura, curso, módulo o su equivalente, objeto de la recalificación; y,\n\n"
                "b. Disponga al docente responsable de la asignatura, curso, módulo o su equivalente, remita con copia a la Dirección del Departamento, la correspondiente rúbrica, incluso cuando se trate de un medio o instrumento de evaluación rendido de forma oral, a los docentes designados para la recalificación y la entrega del medio o instrumento de evaluación, en el caso de que el estudiante haya informado que se encuentra bajo su custodia.\n\n"
                "El Director del Departamento en el término máximo de un día a partir de recibida la solicitud por parte del Director de Carrera o Coordinador de Nivelación, dispondrá al docente que corresponda para que en el término máximo de un (1) día entregue la rúbrica y el medio o instrumento de evaluación, en el caso de que corresponda. En el término máximo de un (1) día a partir de receptada la documentación solicitada, el Director de Departamento coordinará con el área de conocimiento respectiva y designará a los miembros del personal académico para la recalificación, adjuntando la documentación recopilada hasta ese momento, disponiendo la entrega del informe de recalificación al Director de Carrera o Coordinador de Nivelación.\n\n"
                "El personal académico designado, en el término máximo de dos (2) días, recalificará el o los medios e instrumentos de evaluación y remitirán al Director de Carrera o Coordinador de Nivelación el informe debidamente suscrito, en el que conste las calificaciones y el promedio obtenido por la recalificación.\n\n"
                "Si el promedio que consta en el informe de recalificación es mayor a la calificación registrada, el Director de Carrera o Coordinador de Nivelación en el término máximo de un (1) día, informará de este particular al docente responsable de la asignatura, curso, módulo o su equivalente; quien a su vez deberá realizar lo establecido en el artículo relacionado con el procedimiento para modificación de registro de calificaciones por recalificación, del presente reglamento.\n\n"
                "Si el promedio que consta en el informe de recalificación es menor a la calificación registrada, el Director de Carrera o Coordinador de Nivelación, en el término máximo de un (1) día, informará al estudiante del resultado obtenido y remitirá a la Unidad de Registro la documentación de respaldo exclusivamente para el archivo correspondiente sin que se cumpla con el procedimiento para modificación de registro de calificaciones por recalificación."
            ),
            "ruta_anexo": "/formatos/Anexo_Recalificacion.docx",
        },
        {
            "codigo_proceso": "PROC-05",
            "titulo": "Legalización de Documentos",
            "flujo_pasos": [
                "Identificar a todos los suscriptores del documento a legalizar, distinguiendo entre autoridades y servidores públicos, cuya firma electrónica es obligatoria en el ejercicio de sus funciones conforme al Decreto Ejecutivo 981 y el Acuerdo Ministerial No. 17, y los estudiantes u otros terceros no servidores públicos.",
                "Determinar de manera conjunta una única modalidad de suscripción para todo el documento, ya sea íntegramente mediante firma electrónica o íntegramente de forma manuscrita, sin admitir combinaciones.",
                "Verificar que en ningún caso se combinen firmas electrónicas y manuscritas en el mismo documento, pues ello invalidaría el instrumento conforme a la Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos.",
                "Proceder a la suscripción del documento bajo la modalidad única acordada, a fin de que el servidor público o autoridad competente pueda validar y legalizar el mismo.",
            ],
            "contexto_legal": "De conformidad con los artículos 1 del Decreto Ejecutivo 981 de 28 de enero de 2020; 2 y 4 del Acuerdo Ministerial No. 17 de 1 de julio de 2020, el uso de la firma electrónica es obligatorio únicamente para las autoridades, funcionarios y servidores públicos que en el ejercicio de sus funciones y competencias suscriban documentos. La Ley de Comercio Electrónico, Firmas Electrónicas y Mensajes de Datos no prevé la posibilidad de que un mismo documento sea suscrito por servidores públicos mediante el uso de firma electrónica y por terceros de forma manuscrita. Respecto a los documentos que deban ser suscritos por terceros que no son servidores públicos como es el caso de los estudiantes, en conjunto con los servidores públicos se deberá determinar una sola modalidad para su suscripción, es decir firma electrónica o firma manuscrita, ya que cuando en un documento deba consignarse más de una firma, todas ellas deberán realizarse bajo la misma modalidad, no pueden combinarse.",
            "ruta_anexo": "/formatos/Anexo_Legalizacion.docx"
        },
    ]

    # Conserva la ultima version por codigo (si hay duplicados en la lista)
    # Evitar duplicados en la lista de seed: conservar la última definición por título
    procesos_por_titulo = {}
    for item in procesos_data:
        procesos_por_titulo[item["titulo"]] = item

    for data in procesos_por_titulo.values():
        # Generar un codigo de proceso si no viene en los datos o ignorarlo para asegurar
        # que el sistema sea quien lo gestione.
        codigo = data.get("codigo_proceso")
        existente = None
        if codigo:
            existente = (
                db.query(ProcesoAcademico)
                .filter(
                    ProcesoAcademico.codigo_proceso == codigo,
                    ProcesoAcademico.es_actual.is_(True),
                )
                .first()
            )

        # Si no existe o no se proporcionó, generamos uno secuencialmente
        if not existente:
            if not codigo:
                codigo = generate_next_codigo_proceso(db)
            else:
                # si se dio un codigo y no existe, lo aceptamos; pero si existe, generamos otro
                pass

            proceso = ProcesoAcademico(
                codigo_proceso=codigo,
                version=1,
                es_actual=True,
                titulo=data["titulo"],
                activo=True,
                flujo_pasos=data["flujo_pasos"],
                contexto_legal=data["contexto_legal"],
                ruta_anexo=data.get("ruta_anexo"),
            )
            db.add(proceso)
            db.commit()
            db.refresh(proceso)

            upsert_contexto_proceso(
                data["contexto_legal"],
                codigo,
                titulo=data["titulo"],
                flujo_pasos=data["flujo_pasos"],
            )


def seed_categorias(db: Session) -> None:
    """Crea las categorías de presentación por defecto y mapea los 8 procesos.

    Idempotente: solo crea la categoría si no existe y solo asigna el proceso si
    aún no tiene categoría, por lo que NO sobrescribe asignaciones hechas desde
    el admin. Son datos nuevos; no tocan la base vectorial ni Mistral.
    """
    categorias_default = [
        ("Retiros", ["PROC-01", "PROC-02"]),
        ("Calificaciones de Evaluaciones/Trabajos", ["PROC-07", "PROC-08"]),
        ("Reingresos/Cambios de Carrera", ["PROC-04", "PROC-06"]),
        ("Legalización/Homologación", ["PROC-05", "PROC-03"]),
    ]

    for orden, (nombre, codigos) in enumerate(categorias_default, start=1):
        categoria = db.query(Categoria).filter(Categoria.nombre == nombre).first()
        if not categoria:
            categoria = Categoria(nombre=nombre, orden=orden)
            db.add(categoria)
            db.flush()  # asegura categoria.id disponible

        for codigo in codigos:
            existente = (
                db.query(ProcesoCategoria)
                .filter(ProcesoCategoria.codigo_proceso == codigo)
                .first()
            )
            if not existente:
                db.add(ProcesoCategoria(codigo_proceso=codigo, categoria_id=categoria.id))

    db.commit()


def seed_calendario(db: Session) -> None:
    nombre_periodo = "SI-2026: MARZO - AGOSTO 2026"
    existente = db.query(PeriodoAcademico).filter(PeriodoAcademico.nombre == nombre_periodo).first()
    if existente:
        return

    # Marcar todos los periodos anteriores como no actuales
    db.query(PeriodoAcademico).filter(PeriodoAcademico.es_actual.is_(True)).update({"es_actual": False})

    periodo = PeriodoAcademico(
        id=str(uuid.uuid4()),
        nombre=nombre_periodo,
        fecha_fin_periodo=date(2026, 8, 31),
        es_actual=True,
    )
    db.add(periodo)
    db.flush()

    actividades = [
        ("Recepción de solicitudes de retiro voluntario",           "06 al 10 de abril de 2026",                        date(2026, 4, 6)),
        ("Trámite de solicitudes de retiro voluntario",             "07 al 13 de abril de 2026",                        date(2026, 4, 7)),
        ("Registro de retiro voluntario y actualización de matrícula", "08 al 14 de abril de 2026",                     date(2026, 4, 8)),
        ("Actividades académicas primer parcial",                   "06 de abril al 22 de mayo de 2026",                date(2026, 4, 6)),
        ("Evaluaciones primer parcial",                             "26 de mayo al 01 de junio de 2026",                date(2026, 5, 26)),
        ("Ingreso primera calificación al sistema académico",       "27 de mayo al 04 de junio de 2026",                date(2026, 5, 27)),
        ("Actividades académicas segundo parcial",                  "01 de junio al 17 de julio de 2026",               date(2026, 6, 1)),
        ("Evaluaciones segundo parcial",                            "20 al 24 de julio de 2026",                        date(2026, 7, 20)),
        ("Ingreso segunda calificación al sistema académico",       "21 al 29 de julio de 2026",                        date(2026, 7, 21)),
        ("Examen final",                                            "27 al 31 de julio de 2026",                        date(2026, 7, 27)),
        ("Ingreso de la calificación de examen final al sistema académico", "28 de julio al 05 de agosto de 2026",      date(2026, 7, 28)),
    ]

    for actividad, fecha_texto, fecha_orden in actividades:
        db.add(ActividadCalendario(
            id=str(uuid.uuid4()),
            periodo_id=periodo.id,
            actividad=actividad,
            fecha_texto=fecha_texto,
            fecha_orden=fecha_orden,
        ))

    db.commit()
