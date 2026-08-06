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
const planName = (args && args.plan) || '01-regresiones-bloque-a'
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
    preguntas: { type: 'array', items: { type: 'string' }, description: 'Lo que no pudo decidir solo' },
    desviaciones: { type: 'array', items: { type: 'string' }, description: 'Donde el codigo desmintio al plan' },
    bloqueado: { type: 'boolean' },
  },
  required: ['hecho', 'verificacion', 'comentarios', 'preguntas', 'bloqueado'],
}

const ESQUEMA_CRITICA = {
  type: 'object',
  properties: {
    veredicto: { type: 'string', enum: ['cerrada', 'cerrada_con_reservas', 'rehacer'] },
    razon: { type: 'string' },
    afirmacionesRefutadas: { type: 'array', items: { type: 'string' } },
    respuestas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          pregunta: { type: 'string' },
          respuesta: { type: 'string', description: 'Decision accionable, no un quizas' },
        },
        required: ['pregunta', 'respuesta'],
      },
    },
    paraLaSiguienteFase: { type: 'string' },
    aBacklog: { type: 'array', items: { type: 'string' } },
  },
  required: ['veredicto', 'razon', 'respuestas', 'paraLaSiguienteFase'],
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
     Repositorio: C:\\Users\\Joseph\\Documents\\acreditacion_prueba2, rama remediacion/bloque-a.

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

     Entrega el informe estructurado, con comentarios sobre lo que viste de camino y preguntas
     concretas sobre lo que no pudiste decidir solo.`,
    { label: `impl:f${fase.numero}`, schema: ESQUEMA_IMPL }
  )

  if (!impl) {
    log(`Fase ${fase.numero}: el implementador no devolvio nada. Se detiene el plan.`)
    resultados.push({ fase: fase.numero, titulo: fase.titulo, error: 'sin respuesta del implementador' })
    break
  }

  const critica = await agent(
    `Eres el CRITICO de una fase de remediacion. Tu trabajo NO es aprobar: es comprobar.
     Repositorio: C:\\Users\\Joseph\\Documents\\acreditacion_prueba2, rama remediacion/bloque-a.

     El implementador dice haber cerrado la fase ${fase.numero} ("${fase.titulo}") del plan
     ${planPath}. Su informe:

     HECHO: ${impl.hecho}
     COMMITS: ${(impl.commits || []).join(', ') || 'ninguno declarado'}
     VERIFICACION QUE DECLARA: ${impl.verificacion}
     TESTS: ${impl.lineaBaseTests || 'no declarado'}
     COMENTARIOS: ${(impl.comentarios || []).join(' | ')}
     DESVIACIONES: ${(impl.desviaciones || []).join(' | ') || 'ninguna'}
     PREGUNTAS: ${(impl.preguntas || []).join(' | ') || 'ninguna'}
     BLOQUEADO: ${impl.bloqueado}

     NO TE FIES DEL INFORME. Haz esto:
     1. Lee el diff REAL de sus commits (git show) y el estado actual de los ficheros.
     2. Comprueba cada afirmacion contra el codigo. Lo que no se sostenga, a "afirmacionesRefutadas".
     3. Comprueba que la verificacion que declara demuestra lo que dice demostrar. Una verificacion
        que solo prueba el camino del atacante y no el del usuario legitimo NO vale — ese error
        exacto dejo pasar dos fallos criticos en esta remediacion.
     4. Comprueba W7: la linea base es 6 suites fallidas / 6 / 0 tests. Si cambio, es motivo de
        "rehacer".
     5. RESPONDE CADA PREGUNTA con una decision accionable. No "depende" ni "habria que valorar":
        di que hacer y por que. Si la pregunta es de producto y no puedes decidirla, dilo
        explicitamente y proponi la opcion mas conservadora como valor por defecto.
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
    ? `Decisiones del critico tras la fase ${fase.numero}:\n` +
      (critica.respuestas || []).map((r) => `- ${r.pregunta} -> ${r.respuesta}`).join('\n') +
      `\n${critica.paraLaSiguienteFase || ''}`
    : ''
}

phase('Cerrar')

const cierre = await agent(
  `Escribe el informe de cierre de la ejecucion nocturna del plan ${planPath}, en espanol, para
   Emmanuel, que lo leera por la manana sin haber visto nada de esto.

   Resultado por fases:
   ${JSON.stringify(resultados.map((r) => ({
     fase: r.fase,
     titulo: r.titulo,
     veredicto: r.critica ? r.critica.veredicto : (r.error || 'sin critica'),
     razon: r.critica ? r.critica.razon : '',
     refutado: r.critica ? r.critica.afirmacionesRefutadas : [],
     decisiones: r.critica ? r.critica.respuestas : [],
     backlog: r.critica ? r.critica.aBacklog : [],
   })), null, 1)}

   Empieza por lo que importa: que quedo funcionando, que NO, y que decisiones necesitan su
   respuesta. Se explicito si alguna fase quedo sin hacer y por que. Si el critico refuto algo
   del implementador, dilo — es la informacion mas valiosa del informe.
   Termina con la lista de lo que queda pendiente de este plan.
   Escribelo en planes/resultados/${planName}-<fecha>.md usando la fecha que veas en el ultimo
   commit, y devuelve tambien el texto.`,
  { label: 'cierre', effort: 'high' }
)

return {
  plan: planName,
  fasesTotales: plan.fases.length,
  fasesEjecutadas: resultados.length,
  veredictos: resultados.map((r) => ({
    fase: r.fase,
    veredicto: r.critica ? r.critica.veredicto : (r.error || 'sin critica'),
  })),
  informe: cierre,
}
