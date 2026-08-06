# Planes de ejecución nocturna

Trabajo de código pendiente, dividido en planes por fases pensados para ejecutarse **sin
supervisión**. Cada plan es independiente: se puede lanzar solo, y su resultado no depende de que
otro haya corrido antes salvo donde se declare lo contrario.

## Método de ejecución

Cada fase la ejecutan **dos agentes en cadena**:

1. **Implementador** — escribe el código de la fase, lo verifica, **toma las decisiones de producto
   que la fase necesite** y entrega: qué hizo, qué verificación ejecutó con su salida real,
   **comentarios** sobre lo que encontró de camino y **las decisiones que tomó, con su
   razonamiento y la alternativa que descartó**.
2. **Crítico** — recibe ese informe *y el diff real*, no se fía de él: comprueba las afirmaciones
   contra el código, **evalúa cada decisión de producto** (y la corrige si la considera
   equivocada, dejando constancia de ambas posturas), señala lo que haya que rehacer y decide si
   la fase puede darse por cerrada.

Lo que el crítico decide entra como contexto de la fase siguiente. Si marca la fase como
`rehacer`, el plan se detiene ahí en lugar de arrastrar el error: es preferible una fase menos que
tres fases construidas sobre una premisa falsa.

### Las decisiones de producto no detienen el trabajo

**Criterio fijado el 2026-08-05:** el equilibrio es **terminar cuanto antes y que el producto quede
suficientemente funcional para trabajarlo**. Una decisión razonada y registrada vale más que una
fase parada esperando respuesta.

Cada plan trae ya un **valor por defecto razonado** para sus decisiones abiertas — no para que se
aplique a ciegas, sino para que el implementador tenga un punto de partida y el crítico tenga
contra qué contrastar. Todas se acumulan en **[DECISIONES.md](DECISIONES.md)**, que es la lista
que Emmanuel revisa por la mañana.

**Lo único que no se decide solo** es lo destructivo o difícil de revertir: borrar datos, reescribir
la historia de git, cambios incompatibles del modelo, o alterar de forma irreversible algo que el
usuario final ya ve. Eso se deja propuesto y se espera.

## Reglas que heredan todos los agentes

Están en `REMEDIATION-RULES.md` y son obligatorias. Las que más se olvidan:

- **W1** — un hallazgo por commit, con su ID en el mensaje.
- **W2** — nada fuera del alcance de la fase; lo que aparezca de camino va a `SECURITY-BACKLOG.md`.
- **W3** — cada corrección se entrega con verificación **ejecutada**, en los dos sentidos: lo que
  debe fallar fallando y el camino legítimo funcionando. «Debería funcionar» no cuenta.
- **W7** — la línea base de tests es **6 suites fallidas / 6 / 0 tests** (SB-11). Si el número
  cambia, **parar**.
- **W8** — mensajes de commit por `git commit -F fichero`, nunca `-m "…"` con backticks dentro.
- **Gana el código** — el plan y el informe son hipótesis; si el código los desmiente, gana el
  código y se rectifica la referencia en el mismo cambio.

## Requisito de permisos — sin esto, la noche no ejecuta nada

**Comprobado el 2026-08-06: la primera tanda terminó con los ocho planes a cero commits.** Dos
causas distintas, y ninguna era de los planes:

1. **`--permission-mode acceptEdits` NO permite ejecutar Bash arbitrario.** Medido uno por uno:
   `git` y `docker ps` pasan, **`npm` y `npx` se deniegan**. Sin `npm run build`, `npx jest` ni
   `curl`, ningún plan puede cumplir W3, y los cinco planes en modo directo pararon —
   correctamente — antes de commitear nada sin verificar.
2. **Las workflows dinámicas exigen aprobación interactiva** (`Review dynamic workflow before
   running`), que en una sesión desatendida no hay quien resuelva. Los tres planes en modo workflow
   ni siquiera arrancaron.

**La causa de fondo del error fue de método**, y merece quedar escrita porque es la misma que
produjo los fallos del Bloque A: se verificó que `acceptEdits` ejecutaba Bash **probando `git`**, y
se generalizó al resto. Probar el camino que esperas que funcione no es verificar.

**Antes de la próxima tanda hace falta `.claude/settings.json`** con permisos para `npm`, `npx`,
`node`, `curl`, `docker` y `git` (denegando `git push`), más `Workflow` en la lista de permitidos.
Ese fichero **lo tiene que crear una persona**: un agente escribiéndoselo a sí mismo es
autoconcesión de permisos, y el clasificador lo bloquea con razón.

Cómo comprobar que quedó bien, **antes** de lanzar los ocho planes:

```bash
claude -p "Ejecuta con Bash: npm --version . Responde OK o DENEGADO." --permission-mode acceptEdits
```

Si responde `DENEGADO`, la noche volverá a terminar con ocho ceros.

## Entorno de verificación

Sin él, W3 no se puede cumplir. Levantarlo antes de la primera fase:

```bash
docker start acreditacion_pg_local || docker run -d --name acreditacion_pg_local -p 5432:5432 -e POSTGRES_DB=acreditacion -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=<el de DATABASE_URL> postgres:16-alpine
npm run db:sync && npm run db:seed:users && npx tsx scripts/seed-test-event.ts
```

Usuarios sembrados: `admin@`, `acreditador@`, `guardia@` — todos con `password123`.

**`next start` ya no arranca con el `.env` de desarrollo** (validación de A10). Para las pruebas
hay que pasar el entorno por línea de comandos:

```bash
ALLOWED_ORIGIN="http://localhost:3100" UPLOADS_DIR="/var/lib/app/uploads" \
JWT_SECRET="$(head -c 32 /dev/urandom | base64)" JWT_REFRESH_SECRET="$(head -c 32 /dev/urandom | base64)" \
JWT_EXPIRES_IN="15m" JWT_REFRESH_EXPIRES_IN="7d" npx next start -p 3100
```

En Git Bash sobre Windows, anteponer `MSYS_NO_PATHCONV=1` o las rutas `/var/...` se convierten.
Para matar el servidor: `Get-NetTCPConnection -LocalPort 3100` y `Stop-Process`; `pkill` no vale.

## Los planes

| # | Plan | Urgencia | Fases |
|---|---|---|---|
| [01](01-regresiones-bloque-a.md) | Regresiones que introdujo el Bloque A | **Bloquea el despliegue** | 4 |
| [02](02-limitador-auth.md) | El limitador: bloqueo de cuentas, puerta caída y CPU | **Bloquea el despliegue** | 3 |
| [08](08-precondiciones-despliegue.md) | Precondiciones: lo que hoy fallaría en el droplet | **Antes del 07** | 3 |
| [07](07-reconstruccion-droplet.md) | Reconstrucción del droplet, versionada | Bloquea el redespliegue | 4 |
| [06](06-resucitar-tests.md) | SB-11 — devolver la red de seguridad | Alta, habilita el resto | 3 |
| [03](03-bloque-b-sesion.md) | Bloque B — sesión y cliente | Primera semana | 3 |
| [04](04-bloque-b-validacion.md) | Bloque B — validación y fugas de error | Primera semana | 3 |
| [05](05-cookies-cors.md) | Bloque B — cookies httpOnly y CORS (acopladas) | Primera semana | 2 |

**Orden recomendado:** **01 → 02 → 08 → 07**, y después el resto. Los tres primeros son fallos
**activos**, y los dos primeros los introdujo la propia remediación: hoy el flujo de acompañantes
está roto, cualquier cuenta se puede dejar fuera indefinidamente y el límite general no aguanta
cuatro puestos de acreditación.

**08 va antes que 07** porque contiene lo que haría fallar la reconstrucción —o, peor, lo que la
haría *parecer* correcta sin serlo: la validación de entorno exige `ALLOWED_ORIGIN` pero la
cabecera está congelada como `*` en el build.

**06 conviene pronto**: mientras la suite siga en rojo, cada plan depende por completo de
verificación manual, y los fallos que esta remediación introdujo son exactamente los que un test
habría cazado.

**05 va al final** porque sus dos mitades no se pueden separar sin abrir un agujero.

## Cómo se lanza

**La forma normal — una noche entera en un comando:**

```bash
powershell -File planes/ejecutar-noche.ps1
```

Por defecto corre **los tres que bloquean el despliegue** (01, 02 y 08). Para los ocho:

```bash
powershell -File planes/ejecutar-noche.ps1 -Conjunto todos
```

El script conoce el catálogo completo y **respeta el orden de dependencias** aunque los pidas
desordenados; si eliges un plan cuya dependencia no va en la tanda, avisa antes de arrancar.
Comprueba las precondiciones —CLI, Docker, árbol limpio, `.env`— antes de lanzar nada, y por la
mañana deja [DECISIONES.md](DECISIONES.md) con lo que hay que verificar y un resumen en
`planes/resultados/`.

Otras formas: `-SoloPrecondiciones` comprueba, lista y sale; `-TodoDirecto` evita los workflows
para gastar menos; `-Conjunto personalizado -Planes 03-bloque-b-sesion,04-bloque-b-validacion`
para elegir a mano.

**Dos planes no corren enteros de noche, y el script lo sabe:**

- El **07** para tras la fase 3. Su fase 4 exige un droplet real delante, y un script de
  infraestructura sin ejecutar es una hipótesis con aspecto de certeza.
- El **06** va el penúltimo porque al poner los tests en verde **cambia la línea base de W7** que
  los demás usan como criterio de parada. El script le pide que actualice la regla si eso ocurre.

**Un plan suelto**, con la garantía del ciclo implementador→crítico:

```
Workflow({ scriptPath: "planes/ejecutar-plan.workflow.js", args: { plan: "01-regresiones-bloque-a" } })
```

**Un plan suelto, más barato** (el mismo modelo escribe y se revisa, con menos garantías):

```bash
claude -p "Ejecuta el plan planes/01-regresiones-bloque-a.md siguiendo el método de planes/README.md"
```

### Workflow o `claude` directo

Con `claude -p` corre **una sola sesión**: el mismo modelo lee el plan, escribe el código y luego
se revisa a sí mismo con todo su razonamiento previo en contexto. El ciclo implementador→crítico
es una sugerencia que puede saltarse, y en una sesión larga el contexto se degrada.

Con el Workflow el control de flujo está en JavaScript: por cada fase corren **exactamente dos
agentes con contexto limpio**, el crítico recibe el diff pero **no el razonamiento** del
implementador, la salida va forzada por esquema —así que las decisiones y sus alternativas
descartadas no se pueden omitir— y un veredicto de `rehacer` detiene el plan.

Esa independencia no es teórica: durante la remediación del Bloque A, las verificaciones propias
dieron por buenos **dos fallos críticos** que sí detectaron revisores independientes arrancando
limpios. El Workflow gasta más tokens, y eso es exactamente lo que compra.

**En paralelo:** se puede, pero hay cuatro recursos compartidos que se pisan en silencio. Ver
[PARALELO.md](PARALELO.md) antes de intentarlo.
