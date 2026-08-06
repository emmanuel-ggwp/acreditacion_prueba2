export const meta = {
  name: 'ejecutar-plan-remediacion',
  description: 'Ejecuta un plan de planes/ por fases: implementador -> critico, con parada si el critico rechaza',
  whenToUse: 'Trabajo nocturno desatendido sobre un plan de la carpeta planes/',
  phases: [
    { title: 'Leer el plan', detail: 'un agente extrae las fases del documento' },
    { title: 'Implementar', detail: 'una fase por vuelta, con verificacion ejecutada' },
    { title: 'Criticar', detail: 'responde preguntas y decide si la fase se cierra' },
    { title: 'Cerrar', detail: 'informe final para Emmanuel' },
  ],
}

// args: { plan: "01-regresiones-bloque-a" }  (nombre del fichero sin .md)
// Tolerar args que llegan como texto JSON: el 2026-08-06 un lanzamiento con
// {plan: "02-..."} llego como string, args.plan salio undefined y el script cayo
// EN SILENCIO al plan 01. Sin plan explicito ahora se para, no se adivina.
const argsObj = typeof args === 'string' ? JSON.parse(args) : args
const planName = argsObj && argsObj.plan
if (!planName) {
  return { error: 'Falta args.plan (nombre del fichero de planes/ sin .md). No se asume ningun plan por defecto.' }
}
const planPath = `planes/${planName}.md`

const REGLAS = `
REGLAS OBLIGATORIAS (estan en REMEDIATION-RULES.md, leelo):
- W1 un hallazgo por commit, con su ID en el mensaje.
- W2 nada fuera del alcance de la fase; lo que aparezca de camino va a SECURITY-BACKLOG.md.
- W3 verificacion EJECUTADA en los dos sentidos: lo que debe fallar fallando, y el camino
  legitimo funcionando. Pega el comando y su salida REAL. "Deberia funcionar" no cuenta.
- W7 linea base de tests: 6 suites fallidas / 6 / 0 tests. Si el numero cambia, PARA.
- W8 mensajes de commit con 'git commit -F fichero', NUNCA -m "..." con backticks dentro.
- GANA EL CODIGO: el plan es una hipotesis. Si el codigo lo desmiente, gana el codigo, se
  aplica lo correcto y se rectifica la referencia en el mismo cambio.
- R2: nunca imprimas el valor de un secreto. Nombre de la variable si, valor no.

DECISIONES DE PRODUCTO -- SE TOMAN, NO SE PREGUNTAN (criterio de Emmanuel, 2026-08-05):
El equilibrio es terminar cuanto antes Y que el producto quede suficientemente funcional para
trabajarlo. Una decision razonada y registrada vale mas que una fase parada esperando respuesta.
- Cada plan trae una tabla "Decisiones de producto" con un valor por defecto YA RAZONADO. Usalo
  salvo que el codigo lo desmienta; si lo desmiente, gana el codigo y lo registras rectificado.
- Registra CADA decision con: que decidiste, por que, QUE ALTERNATIVA DESCARTASTE y que costaria
  cambiarla. Una decision sin la alternativa descartada no esta registrada, esta afirmada.
- NO decidas solo lo destructivo o dificil de revertir: borrar datos, reescribir historia de git,
  cambios incompatibles del modelo, o algo irreversible que el usuario final ya ve. Eso lo
  PROPONES y sigues con el resto de la fase.

ENTORNO (necesario para W3):
  docker start acreditacion_pg_local
  npm run db:sync && npm run db:seed:users && npx tsx scripts/seed-test-event.ts
  usuarios: admin@ / acreditador@ / guardia@example.com, todos password123
  next start NO arranca con el .env de desarrollo: pasa ALLOWED_ORIGIN, UPLOADS_DIR
  (absoluta), JWT_SECRET y JWT_REFRESH_SECRET de 32+ chars, JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN. En Git Bash antepon MSYS_NO_PATHCONV=1.
  Para matar el servidor usa Get-NetTCPConnection -LocalPort <puerto>; pkill no vale.
`

const ESQUEMA_FASES = {
  type: 'object',
  properties: {
    fases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          numero: { type: 'integer' },
          titulo: { type: 'string' },
          objetivo: { type: 'string', description: 'Que hay que conseguir, en dos frases' },
          ficheros: { type: 'array', items: { type: 'string' } },
          verificacion: { type: 'string', description: 'Que exige el plan para darla por buena' },
        },
        required: ['numero', 'titulo', 'objetivo', 'verificacion'],
      },
    },
    preguntasAbiertas: { type: 'array', items: { type: 'string' } },
  },
  required: ['fases'],
}

const ESQUEMA_IMPL = {
  type: 'object',
  properties: {
    hecho: { type: 'string', description: 'Que se cambio y por que, con file:line' },
    commits: { type: 'array', items: { type: 'string' } },
    verificacion: { type: 'string', description: 'Comandos EJECUTADOS y su salida real' },
    lineaBaseTests: { type: 'string', description: 'Salida de npx jest --silent (Test Suites)' },
    comentarios: { type: 'array', items: { type: 'string' }, description: 'Lo que encontro de camino' },
    decisiones: {
      type: 'array',
      description: 'Decisiones de producto TOMADAS en esta fase. Vacio solo si la fase no tenia ninguna.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'El de la tabla del plan, p.ej. D1.2' },
          decision: { type: 'string', description: 'Que se decidio, en una frase' },
          porQue: { type: 'string' },
          alternativaDescartada: { type: 'string', description: 'Obligatorio: que se descarto y por que' },
          costeDeCambiarla: { type: 'string' },
          siguioElDefecto: { type: 'boolean', description: 'false si el codigo desmintio el valor por defecto del plan' },
        },
        required: ['decision', 'porQue', 'alternativaDescartada', 'costeDeCambiarla'],
      },
    },
    propuestasQueEsperan: {
      type: 'array',
      items: { type: 'string' },
      description: 'Lo destructivo o irreversible que NO se decidio solo, con la propuesta',
    },
    desviaciones: { type: 'array', items: { type: 'string' }, description: 'Donde el codigo desmintio al plan' },
    bloqueado: { type: 'boolean' },
  },
  required: ['hecho', 'verificacion', 'comentarios', 'decisiones', 'bloqueado'],
}

const ESQUEMA_CRITICA = {
  type: 'object',
  properties: {
    veredicto: { type: 'string', enum: ['cerrada', 'cerrada_con_reservas', 'rehacer'] },
    razon: { type: 'string' },
    afirmacionesRefutadas: { type: 'array', items: { type: 'string' } },
    decisionesEvaluadas: {
      type: 'array',
      description: 'Una entrada por cada decision que tomo el implementador',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          decision: { type: 'string' },
          veredicto: { type: 'string', enum: ['de_acuerdo', 'corregida', 'para_emmanuel'] },
          razonDelCritico: { type: 'string' },
          decisionFinal: { type: 'string', description: 'La que queda en pie tras la evaluacion' },
          costeDeCambiarla: { type: 'string' },
        },
        required: ['decision', 'veredicto', 'razonDelCritico', 'decisionFinal'],
      },
    },
    paraLaSiguienteFase: { type: 'string' },
    aBacklog: { type: 'array', items: { type: 'string' } },
  },
  required: ['veredicto', 'razon', 'decisionesEvaluadas', 'paraLaSiguienteFase'],
}

phase('Leer el plan')
log(`Plan: ${planPath}`)

const plan = await agent(
  `Lee ${planPath} y planes/README.md en el repositorio.
   Extrae sus fases en orden. Para cada una: numero, titulo, objetivo, ficheros implicados y que
   verificacion exige. Extrae tambien las preguntas abiertas del final del documento.
   NO implementes nada. Solo estructura lo que el documento ya dice.`,
  { label: `leer:${planName}`, schema: ESQUEMA_FASES }
)

if (!plan || !plan.fases || plan.fases.length === 0) {
  return { error: `No se pudieron extraer fases de ${planPath}` }
}

log(`${plan.fases.length} fases`)

const resultados = []
let contexto = plan.preguntasAbiertas && plan.preguntasAbiertas.length
  ? `Preguntas abiertas que el plan deja sin decidir:\n- ${plan.preguntasAbiertas.join('\n- ')}`
  : ''

for (const fase of plan.fases) {
  phase(`Fase ${fase.numero}: ${fase.titulo}`)

  const impl = await agent(
    `Eres el IMPLEMENTADOR de una fase de remediacion de seguridad.
     Repositorio: el directorio de trabajo actual, rama remediacion/bloque-a.

     PLAN COMPLETO: lee ${planPath} entero antes de tocar nada. Tu fase es la ${fase.numero}
     ("${fase.titulo}").

     OBJETIVO: ${fase.objetivo}
     VERIFICACION QUE EXIGE EL PLAN: ${fase.verificacion}

     ${contexto ? `CONTEXTO DE LAS FASES ANTERIORES (el critico ya respondio a esto):\n${contexto}` : ''}

     ${REGLAS}

     Implementa SOLO esta fase. Commitea con W1 y W8. Verifica con W3 de verdad: levanta el
     entorno, ejecuta, pega la salida. Si algo del plan resulta falso al contrastarlo con el
     codigo, NO lo implementes a ciegas: registralo en "desviaciones" y haz lo correcto.
     Si te bloqueas o la fase resulta mucho mayor de lo descrito, para y marca bloqueado=true.

     DECISIONES: la seccion "Decisiones de producto" del plan trae valores por defecto razonados.
     TOMALAS -- no las dejes abiertas -- y registra cada una en "decisiones" con su alternativa
     descartada. Lo destructivo o irreversible va a "propuestasQueEsperan" y sigues con el resto.

     Entrega el informe estructurado, con comentarios sobre lo que viste de camino.`,
    { label: `impl:f${fase.numero}`, schema: ESQUEMA_IMPL }
  )

  if (!impl) {
    log(`Fase ${fase.numero}: el implementador no devolvio nada. Se detiene el plan.`)
    resultados.push({ fase: fase.numero, titulo: fase.titulo, error: 'sin respuesta del implementador' })
    break
  }

  const critica = await agent(
    `Eres el CRITICO de una fase de remediacion. Tu trabajo NO es aprobar: es comprobar.
     Repositorio: el directorio de trabajo actual, rama remediacion/bloque-a.

     El implementador dice haber cerrado la fase ${fase.numero} ("${fase.titulo}") del plan
     ${planPath}. Su informe:

     HECHO: ${impl.hecho}
     COMMITS: ${(impl.commits || []).join(', ') || 'ninguno declarado'}
     VERIFICACION QUE DECLARA: ${impl.verificacion}
     TESTS: ${impl.lineaBaseTests || 'no declarado'}
     COMENTARIOS: ${(impl.comentarios || []).join(' | ')}
     DESVIACIONES: ${(impl.desviaciones || []).join(' | ') || 'ninguna'}
     BLOQUEADO: ${impl.bloqueado}

     DECISIONES DE PRODUCTO QUE TOMO:
     ${(impl.decisiones || []).map((d) => `- [${d.id || 's/n'}] ${d.decision}\n     POR QUE: ${d.porQue}\n     DESCARTO: ${d.alternativaDescartada}\n     COSTE DE CAMBIARLA: ${d.costeDeCambiarla}\n     ¿siguio el defecto del plan?: ${d.siguioElDefecto}`).join('\n') || '     ninguna'}

     PROPUESTAS QUE ESPERAN A EMMANUEL:
     ${(impl.propuestasQueEsperan || []).join('\n     ') || '     ninguna'}

     NO TE FIES DEL INFORME. Haz esto:
     1. Lee el diff REAL de sus commits (git show) y el estado actual de los ficheros.
     2. Comprueba cada afirmacion contra el codigo. Lo que no se sostenga, a "afirmacionesRefutadas".
     3. Comprueba que la verificacion que declara demuestra lo que dice demostrar. Una verificacion
        que solo prueba el camino del atacante y no el del usuario legitimo NO vale — ese error
        exacto dejo pasar dos fallos criticos en esta remediacion.
     4. Comprueba W7: la linea base es 6 suites fallidas / 6 / 0 tests. Si cambio, es motivo de
        "rehacer".
     5. EVALUA CADA DECISION DE PRODUCTO, una por una, en "decisionesEvaluadas". El criterio de
        Emmanuel es el equilibrio entre terminar cuanto antes y que el producto quede
        SUFICIENTEMENTE FUNCIONAL PARA TRABAJARLO. Para cada una:
        - "de_acuerdo" si la decision cumple ese equilibrio;
        - "corregida" si no, y entonces escribe en "decisionFinal" la que debe quedar y por que.
          Corregir una decision NO es motivo de "rehacer" salvo que el codigo ya escrito la
          contradiga;
        - "para_emmanuel" SOLO si es destructiva o irreversible.
        Comprueba ademas que cada decision declara la alternativa que descarto: sin eso no esta
        razonada, esta afirmada, y debes exigirla.
        Verifica que la decision es CONSISTENTE CON EL CODIGO que se escribio: una decision
        registrada que el diff no implementa es peor que no tomarla.
     6. Lo que este fuera de alcance pero merezca registrarse, a "aBacklog".

     Veredicto: "cerrada", "cerrada_con_reservas" o "rehacer". Usa "rehacer" si la fase no
     consigue su objetivo o si la verificacion no lo demuestra; es preferible parar a arrastrar
     una premisa falsa a las fases siguientes.

     En "paraLaSiguienteFase" escribe lo que el siguiente implementador necesita saber.`,
    { label: `critica:f${fase.numero}`, schema: ESQUEMA_CRITICA, effort: 'high' }
  )

  const veredicto = critica ? critica.veredicto : 'sin_critica'
  log(`Fase ${fase.numero} -> ${veredicto}`)

  resultados.push({
    fase: fase.numero,
    titulo: fase.titulo,
    implementacion: impl,
    critica: critica,
  })

  if (impl.bloqueado || veredicto === 'rehacer') {
    log(`Se detiene el plan en la fase ${fase.numero}: ${veredicto === 'rehacer' ? (critica.razon || 'el critico pide rehacer') : 'el implementador se bloqueo'}`)
    break
  }

  contexto = critica
    ? `Decisiones ya cerradas tras la fase ${fase.numero} (NO las reabras):\n` +
      (critica.decisionesEvaluadas || [])
        .map((d) => `- [${d.id || 's/n'}] ${d.decisionFinal} (${d.veredicto})`)
        .join('\n') +
      `\n${critica.paraLaSiguienteFase || ''}`
    : ''
}

phase('Cerrar')

const cierre = await agent(
  `Cierras la ejecucion nocturna del plan ${planPath}. Dos entregables, y el segundo es el que
   Emmanuel pidio expresamente.

   Resultado por fases:
   ${JSON.stringify(resultados.map((r) => ({
     fase: r.fase,
     titulo: r.titulo,
     veredicto: r.critica ? r.critica.veredicto : (r.error || 'sin critica'),
     razon: r.critica ? r.critica.razon : '',
     refutado: r.critica ? r.critica.afirmacionesRefutadas : [],
     decisiones: r.critica ? r.critica.decisionesEvaluadas : [],
     propuestas: r.implementacion ? r.implementacion.propuestasQueEsperan : [],
     backlog: r.critica ? r.critica.aBacklog : [],
   })), null, 1)}

   ENTREGABLE 1 -- planes/resultados/${planName}-<fecha>.md (usa la fecha del ultimo commit).
   Informe en espanol para quien no ha visto nada de esto. Empieza por lo que importa: que quedo
   funcionando, que NO, y que quedo pendiente. Se explicito si alguna fase no se hizo y por que.
   Si el critico refuto algo del implementador, DILO: es la informacion mas valiosa del informe.

   ENTREGABLE 2 -- planes/DECISIONES.md. Lee el fichero, respeta lo que ya haya y ANADE una fila
   a la tabla "Registro" por cada decision de producto tomada en esta ejecucion:
     | # | Plan · Fase | Decision | Por que | Alternativa descartada | Coste de cambiarla |
   Usa la decisionFinal del critico, no la del implementador, cuando difieran.
   Marca de forma VISIBLE (negrita o un aviso arriba) las que el critico corrigio y las que
   quedaron "para_emmanuel", porque son las que Emmanuel tiene que mirar primero.
   Anade tambien una seccion "Esperan tu respuesta" con las propuestas destructivas o
   irreversibles que no se decidieron solas.
   Esta tabla es lo que Emmanuel revisa por la manana: si una decision no esta ahi, para el no
   existe.

   Devuelve un resumen breve de ambos.`,
  { label: 'cierre', effort: 'high' }
)

const decisiones = resultados.flatMap((r) =>
  ((r.critica && r.critica.decisionesEvaluadas) || []).map((d) => ({
    fase: r.fase,
    id: d.id,
    decision: d.decisionFinal,
    veredicto: d.veredicto,
  }))
)

return {
  plan: planName,
  fasesTotales: plan.fases.length,
  fasesEjecutadas: resultados.length,
  veredictos: resultados.map((r) => ({
    fase: r.fase,
    veredicto: r.critica ? r.critica.veredicto : (r.error || 'sin critica'),
  })),
  // Lo que Emmanuel revisa por la manana. Las corregidas y las que esperan van primero.
  decisionesDeProducto: decisiones,
  decisionesQueRequierenSuRespuesta: decisiones.filter((d) => d.veredicto === 'para_emmanuel'),
  decisionesCorregidasPorElCritico: decisiones.filter((d) => d.veredicto === 'corregida'),
  informe: cierre,
}
