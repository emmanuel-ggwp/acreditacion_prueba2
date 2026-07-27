# Backlog de seguridad

Mejoras de seguridad surgidas de la **auditoría post-compromiso de julio de 2026**. La fuente
de verdad de los hallazgos es `AUDIT-FINDINGS.md`; este fichero es el **Bloque C** de su plan de
remediación (§7.3): lo que **no bloquea el redespliegue** y no entra en la primera semana.

Fichero propio, separado de `TODO.txt`: aquel contiene ideas de producto en prosa y una lista
de errores de compilación de TypeScript **obsoleta** (apunta a rutas de otra máquina y describe
módulos que hoy sí existen). Mezclar deuda de seguridad con esa lista escondía las entradas.

---

## Cómo se usa este fichero

- Cada entrada lleva un **ID propio** (`SB-nn`) y una **referencia al hallazgo de origen**
  (`Fn-nn`) en `AUDIT-FINDINGS.md`. El ID de backlog y el del hallazgo no son lo mismo: un
  hallazgo puede partirse en una corrección bloqueante y una entrada de backlog.
- **Ningún ID se reutiliza ni se renumera.** Las entradas que se cierran bajan a
  [Entradas cerradas](#entradas-cerradas) con el motivo; no desaparecen.
- El campo **Bloquea el redespliegue** es binario. Si dice *No*, existe en alguna parte una
  corrección mínima que sí es bloqueante — se indica cuál.
- Una entrada se cierra cuando el comportamiento está verificado, no cuando el código está
  escrito.
- Las entradas con **acoplamiento** a otras lo declaran de forma explícita: hay correcciones que
  abren un agujero si se aplican solas.

## Índice — entradas activas

| ID | Entrada | Origen | Esfuerzo |
|---|---|---|---|
| [SB-02](#sb-02--una-sola-fuente-de-verdad-para-las-cabeceras-de-seguridad) | Una sola fuente de verdad para las cabeceras de seguridad | F6-02 | ~2 h |
| [SB-03](#sb-03--csp-con-nonces-retirar-unsafe-inline-y-unsafe-eval) | CSP con nonces: retirar `unsafe-inline` y `unsafe-eval` | F6-03 | ~4 h |
| [SB-04](#sb-04--decidir-un-bundler-y-retirar-la-clave-muerta) | Decidir un bundler y retirar la clave muerta | F6-09 | ~30 min |
| [SB-06](#sb-06--la-comprobación-de-revocación-de-tokens-falla-abierta) | La comprobación de revocación de tokens falla abierta | F3-09 | ~1 h |
| [SB-07](#sb-07--autorización-derivada-del-token-y-no-de-la-base-de-datos) | Autorización derivada del token y no de la base de datos | F3-10 | ~4 h |
| [SB-09](#sb-09--validar-el-certificado-de-la-base-de-datos-si-alguna-vez-se-externaliza) | Validar el certificado de la base de datos si alguna vez se externaliza | F2-06 | ~1 h |
| [SB-10](#sb-10--poweredbyheader-false) | `poweredByHeader: false` | F6-07 | ~5 min |
| [SB-11](#sb-11--la-suite-de-tests-no-arranca-ninguna-de-las-6-suites-ejecuta) | La suite de tests no arranca: ninguna de las 6 suites ejecuta | — (línea base de remediación) | ~4 h |

**Cerradas:** [SB-01](#sb-01--cerrada--prueba-de-identidad-en-el-registro-público-por-rut),
[SB-05](#sb-05--cerrada--implementar-o-retirar-next_public_modify_contact_email),
[SB-08](#sb-08--cerrada--validar-los-bytes-del-fichero-subido-promovida-al-bloque-b).

---

## SB-02 — Una sola fuente de verdad para las cabeceras de seguridad

- **Referencia**: **F6-02** en `AUDIT-FINDINGS.md`, "Fase 6 — Configuración de despliegue".
- **Ficheros**: `next.config.js:19-42` y `src/middleware/security.ts:15-37`, aplicado por
  `src/middleware.ts:28` (`matcher: '/api/:path*'`).
- **Bloquea el redespliegue**: **No** — pero una parte sí. **Eliminar el respaldo comodín `'*'`
  de los dos sitios y exigir `ALLOWED_ORIGIN`** es la corrección de **F2-04**, va en el Bloque A
  (elemento A10) y **no espera aquí**. Lo que queda en el backlog es la **unificación**, que es
  refactor y no cierre de agujero.

- **Contexto**: el mismo juego de cabeceras se emite desde dos lugares con ámbitos solapados —
  la configuración estática cubre `/:path*`, el middleware solo `/api/:path*`— y **las dos
  versiones no coinciden**:
  - `Access-Control-Allow-Origin` recibe un valor **estático** de una y el **`Origin` reflejado**
    de la otra.
  - `Access-Control-Allow-Headers` incluye `Authorization` **solo** en la del middleware, que es
    la cabecera con la que esta aplicación autentica. La aplicación funciona porque el middleware
    corrige a la configuración estática — eso no es una arquitectura, es una coincidencia
    afortunada.
  - Las páginas y los endpoints RSC reciben **solo** la copia estática. Quien endurezca la CSP
    editando `security.ts` creerá haber protegido la aplicación y solo habrá tocado `/api/*`.

- **Propuesta técnica**: dejar las cabeceras **estáticas** en `next.config.js`, donde cubren todas
  las rutas y no solo `/api`, y reducir el middleware a la lógica de CORS que necesita ser
  dinámica. Una cabecera, un sitio donde se define.

- **Acoplamiento**: ver **F2-04** y **F3-08**. Migrar la sesión a cookies (corrección de F3-08)
  **activa** la explotabilidad del CORS permisivo. **Nunca F3-08 en solitario.**

---

## SB-03 — CSP con nonces: retirar `unsafe-inline` y `unsafe-eval`

- **Referencia**: **F6-03** en `AUDIT-FINDINGS.md`.
- **Ficheros**: `next.config.js:33` y `src/middleware/security.ts:18` (la misma cadena,
  duplicada — se resuelve junto con **SB-02**).
- **Bloquea el redespliegue**: **No.**

- **Contexto y calibración honesta de la prioridad**: con `script-src 'self' 'unsafe-inline'
  'unsafe-eval'`, la CSP **no aporta defensa frente a XSS**. Dicho eso, **no es el vector y no lo
  habría sido**: la Fase 4 no encontró XSS (0 `dangerouslySetInnerHTML`) y una CSP no habría
  detenido React2Shell, que ejecuta código **en el servidor**, antes de que ninguna cabecera
  llegue a un navegador. Esto es defensa en profundidad, no una brecha abierta.

- **Propuesta técnica**: CSP basada en **nonce por petición**, emitido desde el middleware y
  propagado al `<script>` de Next. Acotar además `img-src`, que hoy admite `https:` genérico
  —cualquier host TLS— y permite exfiltración por URL de imagen.

- **Ya hecho en el Bloque B, no repetir aquí**: retirada de `X-XSS-Protection` (obsoleta) y
  resolución del conflicto entre `X-Frame-Options: SAMEORIGIN` y `frame-ancestors 'none'`. Eran
  baratas e independientes del trabajo de nonces.

---

## SB-04 — Decidir un bundler y retirar la clave muerta

- **Referencia**: **F6-09** en `AUDIT-FINDINGS.md`.
- **Ficheros**: `next.config.js:6-8` (clave `turbopack`, objeto vacío) y `:43-49` (hook `webpack`).
- **Bloquea el redespliegue**: **No.**

- **Contexto — verificado, ya no es una incógnita**: ambos bundlers están declarados en el mismo
  fichero. La Fase 7 confirmó que **el build corre con Turbopack** (`.next/build-manifest.json`
  lista `static/chunks/turbopack-*.js`; `required-server-files.json` tiene clave `"turbopack"`),
  y el usuario confirmó que **no se fuerza bundler** en el despliegue. Por tanto **el hook
  `webpack()` no se ejecuta, ni en local ni en producción**: son 7 líneas de código muerto que
  aparentan configurar algo.

- **Alcance real, para no exagerarlo**: lo que el hook aplica es la exclusión de `sequelize` **en
  el cliente**, y `serverExternalPackages` (`next.config.js:5`) ya cubre el lado servidor. Que el
  hook no corra **no explica F2-02** (el módulo de firma JWT llegando al bundle de cliente, que
  además quedó **cerrado**: no hay filtración de secretos). La barrera que falta es
  **`server-only`** (F2-03, Bloque B). **Son problemas independientes** y corregir este no cierra
  aquel.

- **Propuesta técnica**: eliminar el hook `webpack` y quedarse con la clave `turbopack`. Cualquier
  exclusión que importe va a `serverExternalPackages` o a `server-only` — mecanismos que no
  dependen del bundler.

---

## SB-06 — La comprobación de revocación de tokens falla abierta

- **Referencia**: **F3-09** en `AUDIT-FINDINGS.md`. — **Fichero**: `src/middleware/auth.ts:42-49`.
- **Bloquea el redespliegue**: **No.** No es un bypass: requiere que la consulta a la base de
  datos falle *y* que el atacante ya posea un token revocado.
- **Propuesta**: invertir el sentido del fallo — si la comprobación de revocación no puede
  ejecutarse, **denegar**. Un error de base de datos no debe traducirse en acceso concedido.

---

## SB-07 — Autorización derivada del token y no de la base de datos

- **Referencia**: **F3-10** en `AUDIT-FINDINGS.md`. — **Fichero**: `src/middleware/auth.ts:33-37`.
- **Bloquea el redespliegue**: **No.**
- **Contexto**: el rol viaja dentro del token y no se contrasta con la base de datos. Con
  `JWT_EXPIRES_IN` de **7 días** por defecto (`src/lib/jwt.ts:5`), **degradar o revocar el rol de
  alguien tarda hasta una semana en surtir efecto**. Es un problema de respuesta a incidentes:
  el día que haya que retirarle permisos a una persona, no se podrá hacer rápido.
- **Propuesta**: releer el rol desde la base de datos en las rutas sensibles, o acortar la vida
  del access token apoyándose en la rotación de refresh que **ya funciona correctamente**.

---

## SB-09 — Validar el certificado de la base de datos si alguna vez se externaliza

- **Referencia**: **F2-06** en `AUDIT-FINDINGS.md`. — **Fichero**: `src/lib/sequelize.ts:27`.
- **Bloquea el redespliegue**: **No**, y conviene entender por qué. `rejectUnauthorized: false`
  anula la protección frente a un intermediario activo, **pero la reconstrucción usa PostgreSQL
  autoalojado en el mismo droplet**, por localhost o socket Unix: **no hay red intermedia**, luego
  no hay nada que interceptar.
- **Cuándo deja de ser backlog**: **el día que la base de datos salga de la máquina.** Entonces
  pasa a bloqueante inmediato.
- **Propuesta**: `rejectUnauthorized: true` con el certificado de CA del proveedor.
- **No confundir con F6-04**, que toca las mismas dos líneas y **sí** es bloqueante (Bloque A,
  A8): aquel es que **`DB_SSL` no puede desactivarse**, lo que impide arrancar contra un Postgres
  local. Mismo fichero, dos problemas distintos.

---

## SB-10 — `poweredByHeader: false`

- **Referencia**: **F6-07** en `AUDIT-FINDINGS.md`. — **Fichero**: `next.config.js`.
- **Bloquea el redespliegue**: **No.**
- **Contexto**: toda respuesta anuncia `X-Powered-By: Next.js`. Se registra por su relación con la
  hipótesis principal —la explotación de React2Shell fue **masiva y automatizada**, y ese barrido
  se apoya en identificar despliegues de Next— pero **quitarlo no es una defensa**: el
  fingerprinting tiene otras vías igual de fiables, empezando por las rutas `/_next/`. Una línea
  de configuración que no cuesta nada, con expectativas realistas sobre lo que consigue.

---

## SB-11 — La suite de tests no arranca: ninguna de las 6 suites ejecuta

- **Referencia**: no procede de un hallazgo de auditoría. Es la **línea base de la sesión de
  remediación**, medida el **2026-07-27** antes del primer commit del Bloque A.
- **Ficheros**: `src/models/*.ts` (el `init` en tiempo de importación), `src/models/index.ts:7`,
  `src/lib/sequelize.ts:6`, `jest.setup.js`, `jest.config.js`.
- **Bloquea el redespliegue**: **No.** Pero **degrada la regla de trabajo W7** durante todo el
  Bloque A — ver abajo, porque eso sí afecta a cómo se valida cada corrección.

- **Medición de partida** (`npm test`, sin modificar nada del repositorio):

  ```
  Test Suites: 6 failed, 6 total
  Tests:       0 total
  Time:        ~19,5 s
  ```

  Las 6 suites son `authService`, `awardService`, `accreditationService`, `eventService`,
  `api/auth/login/route` y `api/auth/register/route`. **Ninguna llega a ejecutar un solo test**:
  todas mueren en `Test suite failed to run`.

- **Causa raíz**, idéntica en las 6:

  ```
  TypeError: Cannot read properties of undefined (reading 'getQueryInterface')
      at ParticipantSchedule.init (src/models/ParticipantSchedule.ts:17)
      at src/models/index.ts:7
  ```

  Los modelos llaman a `Model.init(...)` **en el momento de importarse**, lo que exige una
  instancia de Sequelize ya construida. Bajo Jest no hay conexión a base de datos, la instancia
  queda `undefined` y la importación revienta antes de que se registre ningún test. Como
  `src/services/*` importa `src/models/index.ts`, la cadena arrastra a cualquier suite que toque
  un servicio. Los umbrales de cobertura (80 %) fallan en consecuencia al 0 %.

- **Consecuencia para el Bloque A, y es el motivo de registrar esto aquí**: **W7 no puede ser la
  red de seguridad.** La regla dice que cualquier test que pase a fallar detiene el trabajo, pero
  con la suite entera en rojo **no hay nada verde que proteger** y una regresión introducida por
  una corrección sería indistinguible del estado actual. Durante el Bloque A, la carga de la
  prueba recae por completo en **W3** — prueba ejecutable por corrección, más la comprobación de
  que el camino legítimo sigue operando. W7 se sigue aplicando, pero solo puede confirmar que la
  línea base no empeora: 6 fallos antes, 6 fallos después.

- **Por qué no se arregla dentro del Bloque A**: es un cambio estructural en la inicialización de
  los modelos (o la introducción de un doble de la instancia de Sequelize en `jest.setup.js`),
  con alcance sobre `src/models/` completo. Entra de lleno en lo que **W2** prohíbe hacer de
  camino. No bloquea el redespliegue: la aplicación arranca correctamente en ejecución real,
  donde la instancia sí existe.

---

## Entradas cerradas

### SB-01 — CERRADA — Prueba de identidad en el registro público por RUT

**Motivo del cierre: la entrada quedó sin objeto por una decisión de producto.**

Proponía un **token de un solo uso** emitido por `lookup` y exigido por `register`, para que la
automodificación de datos por parte de un participante estuviera respaldada por una prueba de
identidad real en vez de por el mero conocimiento de un `participantId` que el propio endpoint
público entregaba.

El **2026-07-27 el usuario decidió que un participante ya inscrito NO puede modificar sus datos
por sí mismo: debe comunicarse con un contacto humano.** Eso elimina el caso de uso que el token
venía a asegurar. **La corrección de F4-01 pasa a cerrar el camino de escritura en vez de
asegurarlo** —si el participante ya está inscrito, `register` rechaza y devuelve el mensaje de
contacto—, lo que además es más simple y más barato. Ver `AUDIT-FINDINGS.md` §7.3, elemento **A3**.

**Lo que sí sobrevive de esta entrada, y no debe perderse:** el rate limiting por RUT en el
`lookup` que reclama **F3-02** sigue siendo necesario — el `lookup` continúa siendo un oráculo de
enumeración, con token o sin él. Está en el **Bloque B**.

> **Constancia de una premisa fallida.** La redacción original de SB-01 afirmaba que *"el producto
> ya decidió que la automodificación pasa por una persona"*, apoyándose en que
> `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL` mostraba ese aviso en la landing, y concluía que **la
> interfaz cerraba esa puerta y la API no**. La Fase 6 (**F6-10**) demostró que **la premisa era
> falsa**: la variable no se leía en ningún sitio. La política existía como intención, no como
> código. Que la decisión posterior del usuario haya coincidido con lo que la entrada suponía
> **no valida el razonamiento** — se dio por hecho algo que no se había comprobado.

### SB-08 — CERRADA — Validar los bytes del fichero subido (promovida al Bloque B)

**Motivo del cierre: subió de bloque. No es deuda diferida, es trabajo de la primera semana.**

Proponía comprobar los **bytes mágicos** del fichero contra la extensión declarada, en lugar de
confiar en el `Content-Type` que envía el cliente (`src/app/api/uploads/route.ts:31`).

Estaba clasificada como baja **apoyándose en una premisa que resultó falsa**: que el fichero se
servía por un handler que fijaba el `Content-Type` desde `EXT_MIME`, de modo que había un segundo
control en la lectura. El **2026-07-27** el usuario informó de que el despliegue anterior servía
las imágenes por un **symlink dentro de `public/`**, lo que —por el orden de `afterFiles`— dejaba
**el handler fuera del camino de lectura**. Esa segunda red **no estaba puesta**.

En la especificación de reconstrucción (`AUDIT-FINDINGS.md` §7.4) la lectura pasa a servirla
**Nginx**, así que la validación **en la subida** queda como **el único control que la aplicación
ejerce sobre estos ficheros**. Va al **Bloque B**; ver §7.3 para por qué a B y no a A, y bajo qué
condición pasaría a A.

### SB-05 — CERRADA — Implementar o retirar `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL`

**Motivo del cierre: resuelta, y su implementación subió al Bloque A.**

La entrada planteaba una decisión: implementar la política de "para modificar, contacta" o retirar
la variable, que estaba declarada en `.env` y `.example.env` con **cero usos en el código**.

**Decidido: implementar.** La variable pasa a tener uso real — es el contacto que se muestra al
**rechazar** un intento de modificación de un participante ya inscrito. Como esa política se
aplica en el mismo cambio que cierra F4-01, **no es deuda diferida**: forma parte del elemento
**A3** del Bloque A, que bloquea el redespliegue.

**Requisito que viaja con ella:** la variable debe quedar documentada en `.example.env`, que hoy
la declara vacía, junto con las otras dos que faltan (`ALLOWED_ORIGIN` y `DB_SSL`) — elemento
**A10**.
