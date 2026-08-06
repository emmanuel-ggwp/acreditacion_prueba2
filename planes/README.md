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

```bash
# un plan concreto
claude -p "Ejecuta el plan planes/01-regresiones-bloque-a.md siguiendo el método de planes/README.md"
```

O con el script de orquestación, que ya encadena implementador y crítico por fase:

```
Workflow({ scriptPath: "planes/ejecutar-plan.workflow.js", args: { plan: "01-regresiones-bloque-a" } })
```
