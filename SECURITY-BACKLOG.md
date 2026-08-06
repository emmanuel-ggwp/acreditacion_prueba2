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
| [SB-12](#sb-12--react-table-sin-mantenimiento-obliga-a-legacy-peer-deps) | `react-table` sin mantenimiento obliga a `legacy-peer-deps` | — (surgido en A7) | ~3 h |
| [SB-13](#sb-13--postcss-sin-parchear-y-la-trampa-de-npm-audit-fix---force) | ⏱ `postcss` sin parchear, y la trampa de `npm audit fix --force` | — (surgido en A7) | ~1 h |
| [SB-14](#sb-14--params-tratado-como-objeto-sincrono-en-awardspagetsx) | `params` tratado como objeto síncrono en `awards/page.tsx` | — (surgido en A7) | ~15 min |
| [SB-15](#sb-15--el-script-lint-no-existe-desde-nextjs-16) | El script `lint` no existe desde Next.js 16 | — (surgido en A7) | ~15 min |
| [SB-16](#sb-16--sustituir-legacy-peer-deps-por-un-overrides-acotado) | ⏱ Sustituir `legacy-peer-deps` por un `overrides` acotado | — (surgido en A7) | ~1 h |
| [SB-17](#sb-17--doble-cabecera-authorization-en-el-reintento-tras-un-401) | Doble cabecera `Authorization` en el reintento tras un 401 | — (surgido en A1) | ~1 h |
| [SB-18](#sb-18--manager-no-puede-listar-eventos-el-rol-está-roto-de-facto) | `MANAGER` no puede listar eventos: el rol está roto de facto | — (surgido en A1) | ~1 h |
| [SB-19](#sb-19--tres-páginas-que-muestran-pii-sin-guarda-de-rol) | Tres páginas que muestran PII sin guarda de rol | — (surgido en A1) | ~1 h |
| [SB-20](#sb-20--el-cliente-no-distingue-un-403-y-la-búsqueda-se-traga-el-error) | El cliente no distingue un 403, y la búsqueda se traga el error | — (surgido en A1) | ~2 h |
| [SB-21](#sb-21--get-apiparticipantsidguests-es-un-endpoint-huérfano) | `GET /api/participants/[id]/guests` es un endpoint huérfano | — (surgido en A1) | ~30 min |
| [SB-22](#sb-22--el-limitador-comparte-el-pool-de-5-conexiones-de-la-aplicación) | El limitador comparte el pool de 5 conexiones de la aplicación | — (surgido en A6) | ~30 min |
| [SB-23](#sb-23--endpoint-público-de-evento-roto-desde-siempre-y-sin-consumidores) | Endpoint público de evento roto desde siempre y sin consumidores | — (surgido en A3) | ~30 min |
| [SB-24](#sb-24--la-capacidad-del-evento-no-cuenta-invitados) | La capacidad del evento no cuenta invitados | — (surgido en A4) | decisión de producto |
| [SB-25](#sb-25--un-volcado-con-datos-reales-está-versionado) | ⚠ Un volcado con datos reales está versionado *(parcial: quedan 2 decisiones de Emmanuel)* | — (revisión de despliegue) | decisión |
| [SB-27](#sb-27--get-apipubliceventsslug-devuelve-500-siempre-include-sin-alias) | `GET /api/public/events/[slug]` devuelve 500 siempre | — (surgido en R1-01) | ~30 min |
| [SB-28](#sb-28--el-login-distingue-cuenta-deshabilitada-de-credenciales-inválidas-enumeración-de-estado-de-cuenta) | El login distingue «cuenta deshabilitada» de «credenciales inválidas» | — (surgido en R2-01) | ~30 min |
| [SB-29](#sb-29--dos-logins-o-refresh-del-mismo-usuario-en-el-mismo-segundo--500-por-token-idéntico) | Dos logins del mismo usuario en el mismo segundo → 500 por token idéntico | — (surgido en R2-02) | ~1 h |
| [SB-30](#sb-30--el-cliente-descarta-el-refresh-token-rotado-cierre-de-sesión-forzoso-en-el-segundo-refresh) | El cliente descarta el refresh token rotado: logout forzoso en el 2º refresh | — (surgido en R2-02) | ~30 min |
| [SB-31](#sb-31--esquemas-de-login-duplicados-y-ya-divergentes-dos-loginschema-y-dos-registerschema) | Esquemas de login duplicados y ya divergentes entre validators | — (surgido en R2-03a) | ~30 min |
| [SB-33](#sb-33--next-16-declara-obsoleta-la-convención-middleware-la-fuente-única-de-cors-vive-en-una-api-en-retirada) | La convención `middleware` está deprecada en Next 16 y ahora es la fuente única de CORS | — (surgido en P08-D1) | ~1 h |

> ⏱ **SB-13 y SB-16 tienen ventana fija, no plazo abierto.** Deben resolverse **al terminar los
> cambios de la auditoría y, en cualquier caso, ANTES de que la reconstrucción configure CI y
> Dependabot**. No son deuda diferible: ver [Entradas con ventana fija](#entradas-con-ventana-fija).

**Cerradas:** [SB-01](#sb-01--cerrada--prueba-de-identidad-en-el-registro-público-por-rut),
[SB-05](#sb-05--cerrada--implementar-o-retirar-next_public_modify_contact_email),
[SB-08](#sb-08--cerrada--validar-los-bytes-del-fichero-subido-promovida-al-bloque-b),
[SB-26](#sb-26--cerrada--no-hay-migraciones-el-único-camino-de-esquema-borra-los-datos),
[SB-32](#sb-32--cerrada--npm-run-dbsync-ejecuta-sequelizesync-force-true).

---

## Entradas con ventana fija

La mayoría de este fichero es deuda diferible: se resuelve cuando haya hueco. **Dos entradas no
lo son**, y se separan aquí para que no se pierdan en la lista general.

| ID | Debe estar resuelta antes de… |
|---|---|
| **SB-16** | que la reconstrucción configure **CI y Dependabot** |
| **SB-13** | lo mismo — se prueba junto con SB-16, comparten mecanismo (`overrides`) |

**Por qué esa frontera y no otra.** `AUDIT-FINDINGS.md` §7.4 sitúa Dependabot y `npm audit` en CI
como **la medida de mayor impacto de todo el informe**: es lo que habría avisado del salto
16.0.6 → 16.0.7 y habría cerrado la ventana de siete meses que acabó en el compromiso.

Con `legacy-peer-deps=true` activo de forma global, esos controles **se estrenan ciegos a los
conflictos de peer dependencies** — exactamente el tipo de problema que acaba de aparecer en A7 y
que estuvo oculto precisamente porque nadie lo había registrado. Montar la contramedida principal
de la auditoría con ese punto ciego incorporado desde el primer día es repetir el patrón que el
informe entero existe para romper.

De ahí que el momento sea **al terminar los cambios de la auditoría y antes de tocar CI**, no
«cuando se pueda».

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

## SB-09 — ⚠ ACTIVADA — Validar el certificado de la base de datos administrada

- **Referencia**: **F2-06** en `AUDIT-FINDINGS.md`. — **Fichero**: `src/lib/sequelize.ts:12, 29`.
- **Bloquea el redespliegue**: **SÍ, desde el 2026-08-06.**

**Esta entrada decía «si alguna vez se externaliza». Ya se externalizó:** la decisión del
**2026-08-06** es usar la **base administrada de DigitalOcean** en lugar de PostgreSQL en el
droplet. Su propia condición de activación —«el día que la base de datos salga de la máquina»— se
cumplió, así que deja de ser backlog y pasa a requisito de despliegue.

**Situación exacta del código hoy**, que es lo que hay que entender antes de tocarlo:

- `sequelize.ts:12` — `DB_SSL` es la única fuente de decisión (A8). Correcto y sigue valiendo; lo
  que cambia es que ahora **debe estar en `true`**: las bases administradas de DigitalOcean exigen
  SSL.
- `sequelize.ts:29` — `rejectUnauthorized: true`, que A8 ya dejó puesto. Es lo que SB-09 pedía, **y
  ahí está el problema**: DigitalOcean firma con una CA propia que Node no lleva en su almacén, así
  que **sin darle esa CA la aplicación no conecta**. No es una mejora pendiente: es un fallo de
  arranque garantizado en el primer despliegue.

**Lo que NO es la solución**: bajar a `rejectUnauthorized: false`. Eso convierte el SSL en cifrado
sin autenticación, que es exactamente el defecto que F6-04 corrigió — y con la base fuera de la
máquina ahora sí hay red intermedia que interceptar, que era la razón por la que esta entrada
existía.

**Corrección**: pasar la CA de DigitalOcean, por `dialectOptions.ssl.ca` o `NODE_EXTRA_CA_CERTS`,
con variable nueva declarada en `.example.env` y **validada en `env.ts`**: si `DB_SSL=true` y no hay
CA, que aborte diciéndolo. Los detalles concretos —formato del fichero, si la URL necesita
`sslmode`, caducidad y rotación del certificado— los produce **la fase 2 del plan 07**, que existe
para eso y no los da por supuestos.

- **No confundir con F6-04**, que toca las mismas dos líneas y ya se corrigió (Bloque A, A8): aquel
  era que **`DB_SSL` no podía desactivarse**. Mismo fichero, dos problemas distintos.

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

## SB-12 — `react-table` sin mantenimiento obliga a `legacy-peer-deps`

- **Referencia**: no procede de un hallazgo de auditoría. Surgió al ejecutar **A7** el
  **2026-07-27**, cuando `npm install next@16.2.12` falló con `ERESOLVE` antes de instalar nada.
- **Ficheros**: `.npmrc` (creado en el commit de A7), `package.json` (`react-table@^7.8.0`),
  `src/components/ui/Table.tsx`, `src/types/react-table.d.ts`, `src/types/react-table-config.d.ts`.
- **Bloquea el redespliegue**: **No.** El `.npmrc` versionado ya desbloquea la instalación.

- **El conflicto**: `react-table@7.8.0` declara `peer react@"^16.8.3 || ^17.0.0-0 || ^18.0.0"` y el
  proyecto corre **React 19.2.0**. Ante un `npm install` limpio, el resolutor intenta degradar
  React a 18.3.1 para satisfacerlo, choca con las ~31 dependencias que sí admiten React 19
  (`@emotion/react`, `@floating-ui/*`, `react-select`…) y aborta.

- **Lo que de verdad importa aquí no es el conflicto, es que estaba oculto.** El árbol ya se
  instalaba ignorando peers —React 19.2.0 y `react-table` 7.8.0 conviven hoy en `node_modules`—
  pero **no había `.npmrc` ni en el repositorio ni en el perfil del usuario**: la elección vivía
  en la línea de comandos de quien instaló, y con él se fue. Un `npm install` limpio en una
  máquina nueva fallaba, y nada en el repositorio explicaba por qué ni cómo saltárselo.

- **Por qué se atacó ya la mitad de esto**: `AUDIT-FINDINGS.md` §7.4 pone **Dependabot y
  `npm audit` en CI** como la medida de mayor impacto de todo el informe —es lo que habría
  avisado del salto 16.0.6 → 16.0.7—. Ambos ejecutan instalaciones. Con el árbol irresoluble,
  **ninguna de las dos habría llegado a arrancar**, y la contramedida principal de la auditoría
  habría quedado en el papel. Por eso el `.npmrc` entró en el commit de A7 y no aquí.

- **Lo que queda pendiente**, y es la deuda de fondo: `legacy-peer-deps=true` es global al
  proyecto, así que **silencia todos los conflictos de peers, no solo este**. Un peer
  genuinamente incompatible que aparezca mañana entrará sin avisar. La salida es retirar
  `react-table` —está sin mantenimiento y su último release es de 2021— sustituyéndolo por
  TanStack Table v8 (su sucesor directo, con soporte de React 19) y **eliminar el `.npmrc`**.
  Afecta a un componente y dos ficheros de tipos.

- **Mientras tanto, una advertencia operativa**: ver **SB-13**. No ejecutar
  `npm audit fix --force` en este repositorio.

---

## SB-13 — `postcss` sin parchear, y la trampa de `npm audit fix --force`

- **Referencia**: surgido al verificar **A7** el **2026-07-27**. Guarda relación con **F1-07**
  (dependencias vulnerables), pero es un elemento nuevo: no existía en el informe.
- **Ficheros**: `package.json` (`postcss@^8.5.6` en devDependencies), `package-lock.json`.
- **Bloquea el redespliegue**: **No.** Es la superficie que queda **después** de A7, no un
  agujero abierto por ella.

- **Estado verificado tras subir a Next 16.2.12**:

  | Copia | Versión instalada |
  |---|---|
  | `node_modules/postcss` (top-level) | **8.5.6** |
  | `node_modules/next/node_modules/postcss` (fijada por Next) | **8.4.31** |

  Tras A7, `npm audit --omit=dev` ya **no** marca `next` por advisories propios: lo marca
  `via: postcss, sharp`. Es decir, **la superficie que queda de `next` es prestada**.

- **Advisories que cubren ambas copias**: `GHSA-r28c-9q8g-f849` (alta, parcheado en 8.5.18),
  `CVE-2026-45623` (alta, parcheado en 8.5.12) y `CVE-2026-41305` (media, parcheado en 8.5.10).
  **Ninguna versión publicada de Next.js cierra la copia anidada**, porque Next la fija con
  versión exacta. Ni siquiera la rama 16.3 en preview: lleva 8.5.10, todavía por debajo de 8.5.18.

- **Lo que sí se puede hacer hoy**: la copia **top-level** está en 8.5.6 pese a que
  `package.json` declara `^8.5.6`, rango que ya admitiría 8.5.18. Un `npm update postcss` sanea
  esa mitad sin tocar nada más. La copia anidada bajo `next` **no tiene solución** hasta que
  Vercel suba su pin; toca vigilar releases.

- **La trampa, y es la razón principal de escribir esta entrada**: la salida de `npm audit`
  sugiere `npm audit fix --force`. **No se debe ejecutar en este repositorio.** Para satisfacer
  el límite inferior del rango de metavulnerabilidad de `postcss`, el resolutor puede **degradar
  `next` hasta una versión de la rama 9**, lo que **reintroduciría CVE-2025-55182 y los ~35
  advisories que A7 acaba de cerrar**. Un comando que el propio `npm` recomienda desharía, en
  segundos, la corrección más importante de todo el Bloque A.

  > El número exacto de versión a la que degradaría procede de una fuente que no pudo
  > verificarse de forma independiente, así que se registra como **plausible, no confirmado**.
  > La precaución no depende de esa cifra: la dirección del cambio —degradar `next`— sí está
  > establecida, y la prohibición cuesta cero.

- **La vía que no se había evaluado: `overrides`.** La afirmación de arriba —«la copia anidada no
  tiene solución hasta que Vercel suba su pin»— es cierta *si uno se limita a actualizar*. No lo
  es si se fuerza la resolución desde `package.json`:

  ```json
  "overrides": { "postcss": "^8.5.18" }
  ```

  Esto alcanza **también la copia anidada bajo `next`**, que es justamente la que hoy queda
  abierta por diseño. Si funciona, **cierra los tres advisories** en lugar de la mitad.

  **Riesgo acotado, pero no nulo.** El salto 8.4.31 → 8.5.18 es menor dentro de la misma major y
  `postcss` es estable en semver, así que lo esperable es que no rompa nada. Pero **Next empaqueta
  `postcss`** y lo fija con versión exacta por alguna razón: hay que **verificar que el build sigue
  pasando**, no darlo por hecho.

  **Los dos desenlaces son buenos.** Si funciona, se cierran tres advisories. Si rompe el build, la
  entrada vuelve al backlog **con la prueba concreta de por qué no era viable** — que es mejor
  registro que el actual, donde la vía ni siquiera figuraba como evaluada.

- **Acción**, por orden:
  1. Probar `overrides` de `postcss` **junto con el de SB-16** — comparten mecanismo, así que se
     prueban y se verifica el build **una sola vez**.
  2. Si `overrides` no prospera: `npm update postcss` sanea al menos la copia top-level, y la
     anidada queda a la espera del pin de Next.
  3. En cualquier caso, dejar constancia en el runbook de reconstrucción de que
     `npm audit fix --force` está **prohibido** en este proyecto. Si se añade `npm audit` a CI
     (§7.4), configurarlo en modo informe, **nunca** con corrección automática.

- **Plazo**: ⏱ **ventana fija.** Antes de configurar CI y Dependabot. Ver
  [Entradas con ventana fija](#entradas-con-ventana-fija) y **SB-16**.

---

## SB-14 — `params` tratado como objeto síncrono en `awards/page.tsx`

- **Referencia**: detectado al verificar **A7** el **2026-07-27**. **No lo causa A7** — ya estaba
  roto bajo 16.0.6. No es un hallazgo de seguridad, es un bug de corrección.
- **Fichero**: `src/app/events/[eventId]/awards/page.tsx:9-16`.
- **Bloquea el redespliegue**: **No.** No rompe el build.

- **El defecto**: el componente declara `params` como objeto plano y lo desestructura directo:

  ```tsx
  interface AwardsPageProps {
    params: { eventId: string };      // linea 10-12
  }
  const AwardsPage: React.FC<AwardsPageProps> = ({ params }) => {
    const { eventId } = params;       // linea 16
  ```

  Desde Next.js 16 **`params` es una `Promise` también en Client Components**. Destructurarla
  sin `await` (o sin `React.use()`) deja `eventId` en `undefined`, y ese `undefined` viaja a
  `AwardList`. El `useEffect` de la línea 19 lo esquiva con `if (eventId)`, de modo que el
  síntoma probable no es un error visible sino **una página de premios que no carga nada**.

- **Por qué el typecheck no lo atrapa**: el validador de tipos de rutas que Next genera en
  `.next/types/validator.ts` conserva un escape `& any` en `AppPageConfig`. Se comprobó que el
  fichero regenerado bajo 16.2.12 **mantiene ese escape**, así que el error sigue sin aflorar en
  compilación. Es también la razón por la que **A7 pudo ir sola**: la subida de versión no
  convierte esto en un fallo de build.

- **Acción**: convertir el componente al patrón asíncrono de Next 16 (`React.use(params)` en un
  Client Component) y **revisar si el mismo patrón se repite** en las demás páginas con
  segmentos dinámicos (`participants/[participantId]`, `public/events/[slug]`, etc.). Esa
  revisión es la parte que puede crecer, y es el motivo de no haberlo tocado durante A7.

---

## SB-15 — El script `lint` no existe desde Next.js 16

- **Referencia**: detectado al verificar **A7** el **2026-07-27**. Preexistente: `next lint` se
  eliminó en Next.js 16 y el proyecto ya estaba en 16.0.6.
- **Fichero**: `package.json:9` — `"lint": "next lint"`.
- **Bloquea el redespliegue**: **No.**

- **Por qué se registra pese a ser trivial**: `npm run lint` **falla hoy**, y falla por una razón
  que no tiene nada que ver con la calidad del código. Si se añade a un pipeline de validación
  —o si alguien lo ejecuta para comprobar que A7 no rompió nada— **el fallo se atribuirá a la
  subida de versión**. Una entrada de quince minutos que evita una hora de diagnóstico en falso.

- **Acción**: migrar a ESLint directo (`eslint .`) siguiendo la guía de Next, o retirar el
  script si no se va a usar. Decidirlo antes de montar CI, no después.

---

## SB-16 — Sustituir `legacy-peer-deps` por un `overrides` acotado

- **Referencia**: surgido en **A7** el **2026-07-27**, al versionar `.npmrc`. Es el seguimiento
  directo de esa decisión: **SB-12** trata la causa (`react-table`), esta trata el **instrumento**
  con el que se ha tapado mientras tanto.
- **Ficheros**: `.npmrc` (a eliminar), `package.json` (a añadir el bloque `overrides`).
- **Bloquea el redespliegue**: **No.**
- **Plazo**: ⏱ **ventana fija** — ver abajo. **No es deuda de plazo indefinido.**

- **El problema con la solución actual.** `legacy-peer-deps=true` **desactiva la comprobación de
  peer dependencies para todo el árbol y de forma permanente**. El conflicto real es **uno solo**:
  `react-table@7.8.0` con tope en React 18 frente a React 19.2.0. Se ha respondido a un conflicto
  concreto con un interruptor general. A partir de ahora, **cualquier incompatibilidad futura de
  cualquier paquete entra en silencio** — sin error, sin aviso, sin rastro.

- **Por qué `overrides` es mejor**:

  ```json
  "overrides": {
    "react-table": {
      "react": "$react"
    }
  }
  ```

  1. Waivea **únicamente** la restricción de `react-table`.
  2. Deja la resolución de peers **activa para el resto del árbol**.
  3. Queda **visible en `package.json`**, no escondida tras un flag global en un fichero que
     casi nadie abre.

  La sintaxis `"$react"` remite a la versión de `react` que ya declara el proyecto, de modo que no
  hay un número que se quede obsoleto cuando React suba.

- **Reserva honesta, y hay que decirla antes de intentarlo**: el comportamiento de `overrides`
  frente a **peer** dependencies tiene matices según la versión de npm — `overrides` gobierna con
  claridad las dependencias resueltas, y su efecto sobre la *comprobación* de peers no es
  uniforme entre versiones. **Hay que probarlo.** Si no resuelve el conflicto, `legacy-peer-deps`
  es el **plan B legítimo** y esta entrada se cierra **documentando por qué**, no en silencio.

- **Lo que ninguna de las dos opciones hace.** Ni `overrides` ni `legacy-peer-deps` **validan que
  `react-table` funcione realmente con React 19**. Ambas se limitan a silenciar la objeción del
  resolutor. Lo único que cierra esa pregunta es **SB-12**: retirar `react-table` y sustituirlo.
  Conviene tenerlo presente para no confundir «el install ya no falla» con «esto es compatible».

- **CUÁNDO — condición dura, no preferencia.** Debe resolverse **al terminar los cambios de la
  auditoría y, en cualquier caso, ANTES de que la reconstrucción configure CI y Dependabot**. El
  razonamiento completo está en [Entradas con ventana fija](#entradas-con-ventana-fija); en corto:
  la recomendación central de §7.4 son precisamente Dependabot y `npm audit` en CI, ambos ejecutan
  instalaciones, y con `legacy-peer-deps` activo **dejan de ver los conflictos de peers**.
  Estrenarlos así es estrenarlos ciegos al tipo exacto de problema que acabamos de encontrar.

- **Se prueba junto con SB-13**: comparten mecanismo (`overrides`), así que se aplican y se
  verifica el build **una sola vez**.

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

### SB-26 — CERRADA — No hay migraciones: el único camino de esquema borra los datos

**Motivo del cierre: resuelta y verificada en el plan 08, fase 3 (2026-08-06).**

Decía: `npm run db:sync` ejecutaba `sequelize.sync({ force: true })` (borra y recrea las 16
tablas), la variante `alter` vivía en un huérfano sin script npm, y sin migraciones no había
forma de evolucionar el esquema sin recrearlo.

**Lo hecho**: (1) `db:sync` pasa a `alter: true` por defecto y el DROP exige `FORCE_SYNC=yes`
(ver SB-32); (2) **migraciones con umzug 3** — `npm run db:migrate` / `db:migrate:status`,
runner en `scripts/migrate.ts`, registro en `sequelize_meta`, línea base idempotente y no
destructiva en `migrations/0001-baseline.ts` (los 16 modelos + `rate_limits`). Verificado: sobre
base poblada no toca datos (4 usuarios antes y después); sobre base vacía (`DROP SCHEMA CASCADE`)
crea las 18 tablas y los seeds corren encima; reejecutar es no-op; `down` de la baseline se niega.

**Trade-off registrado (P08-D4.1 en DECISIONES.md)**: la baseline usa `sync()` create-only sobre
los modelos actuales, no DDL congelado a mano. Todo cambio de esquema posterior va en migración
nueva con DDL explícito — modificar los modelos sin su migración es reabrir esta entrada.

**Nota comprobada, para que nadie la reabra**: `force: true` **no** borra la tabla `rate_limits`
del limitador — `sync` solo opera sobre los 16 modelos registrados en `src/models/index.ts`, y
esa tabla no es un modelo (por eso el DDL vive aparte en `db:sync` y en la baseline).

### SB-32 — CERRADA — `npm run db:sync` ejecuta `sequelize.sync({ force: true })`

**Motivo del cierre: resuelta y verificada en el plan 08, fase 3 (2026-08-06), junto a SB-26.**

Decía: el camino documentado de arranque (`db:sync`) hacía `DROP TABLE` de todo sin preguntar, y
había dos `sync-db.ts` divergentes (`force` en `src/scripts/`, `alter` huérfano en `scripts/`).

**Lo hecho, exactamente lo que la entrada proponía**: el huérfano `scripts/sync-db.ts` está
**borrado**; `src/scripts/sync-db.ts` (el de npm) hace `alter` por defecto y `force` solo con
`FORCE_SYNC=yes` exacto — cualquier otro valor, o `--force` sin la variable, **aborta con exit 1
sin tocar nada** (degradar en silencio a `alter` sería otro fallo silencioso). Verificado en los
dos sentidos contra la base con datos: `db:sync` → datos intactos; `FORCE_SYNC=1` y `--force` →
exit 1 y datos intactos; `FORCE_SYNC=yes` → aviso «PÉRDIDA TOTAL» y recreación. La parte de
runbook («el aprovisionamiento de producción usa `db:migrate`, nunca `db:sync`») queda escrita en
el propio script y es insumo de la fase 1-2 del plan 07.

---

## SB-17 — Doble cabecera `Authorization` en el reintento tras un 401

- **Referencia**: surgido en **A1** el **2026-07-27**, al barrer los consumidores de los tres
  endpoints. **No lo causa A1** — afecta ya a los 68 handlers con `withAuth` —, pero A1 lo vuelve
  alcanzable en las tres lecturas de más tráfico, que hasta ahora nunca devolvían 401.
- **Ficheros**: `src/utils/apiClient.ts:25-27, 58-60`, `src/middleware/auth.ts:26`.
- **Bloquea el redespliegue**: **No**, pero es el primer candidato del Bloque B.

**El defecto, verificado leyendo el código.** `apiClient.ts:25` construye las cabeceras con
`new Headers(options.headers || {})` y `:27` añade el token con **`append`**, no con `set`. Ante
un 401, `:58` hace `headers.set('Authorization', ...)` con el token nuevo y `:60` reinyecta ese
mismo objeto como `options.headers` de la llamada recursiva. En esa segunda vuelta, `:25` lo
reconstruye —ya trae `Authorization`— y `:27` vuelve a hacer `append`:

```
Authorization: Bearer <token>, Bearer <token>
```

`auth.ts:26` hace `authHeader.split(' ')[1]`, que sobre esa cadena devuelve `<token>,` — un token
inválido. Resultado: **401 de nuevo**, nuevo refresh, nueva recursión. El `retryConfig` no acota
nada porque la llamada recursiva es una invocación nueva con los valores por defecto.

**Por qué importa.** No se dispara con un token válido, así que no aparece en pruebas cortas: se
manifiesta en la primera sesión que caduque durante el uso. El síntoma sería un cierre de sesión
inexplicable o un bucle, justo en las pantallas de padrón y acreditación.

**Corrección**: usar `set` en lugar de `append` en `:27`, no reenviar la cabecera previa en el
reintento, y acotar la profundidad de recursión.

**Decisión (2026-08-05)**: va al **Bloque B como primer elemento**, por delante de F3-03. Criterio:
salida a producción lo antes posible — no abre agujero de seguridad, es preexistente a A1 y no
bloquea el redespliegue.

---

## SB-18 — `MANAGER` no puede listar eventos: el rol está roto de facto

- **Referencia**: surgido en **A1** el **2026-07-27**. Quedó **fuera del alcance** de A1 (W2).
- **Ficheros**: `src/app/api/events/route.ts:56`, `src/app/api/events/[eventId]/schedules/route.ts:45`,
  frente a `src/components/layout/Sidebar.tsx:20-25` y los `RoleGuard` de `src/app/*/page.tsx`.
- **Bloquea el redespliegue**: **No.**

`GET /api/events` es `[ADMIN, OPERATOR, GUARD]` y **omite `MANAGER`**, pese a que `/participants`
(`participants/page.tsx:27`) y `/accreditation` (`accreditation/page.tsx:12`) sí lo admiten y
**ambas arrancan pidiendo la lista de eventos** (`participants/page.tsx:16`,
`AccreditationPanel.tsx:58`). Un `MANAGER` nunca obtiene un `eventId`, así que no llega a disparar
ninguno de los tres endpoints de A1.

**Decisión (2026-08-05)**: por criterio de mínimo tiempo para el redespliegue, `MANAGER` **queda
inerte** — no se toca `/api/events` ni los `RoleGuard` antes de salir. No es grave: los permisos
inertes no conceden acceso a nadie. La decisión de producto (rol vivo o retirado) queda abierta en
esta entrada y se resuelve en el Bloque B.

**Ampliación (2026-08-05, revisión adversarial de A2) — el rol no está tan muerto como parecía, y
ahora hay un 403 alcanzable por navegación normal.** La afirmación «`MANAGER` no llega al
formulario porque no puede listar eventos» es **falsa**, y conviene no repetirla:

- `src/app/events/[eventId]/participants/page.tsx` **no tiene `RoleGuard` ni `ProtectedRoute`** —
  solo necesita el `eventId` en la URL.
- El `GET` de ese padrón (`events/[eventId]/participants/route.ts:45`) **sí admite `MANAGER`**,
  porque A1 lo incluyó deliberadamente.
- `ParticipantList.tsx:177-187` pinta el botón «Nuevo participante» **sin guarda de rol**.
- Ese botón lleva a `POST /api/participants`, que tras A2 es `[ADMIN, OPERATOR]` ⇒ **403**.

Es decir: un `MANAGER` puede ver el padrón de un evento, ver el botón, pulsarlo y recibir
«Forbidden». Antes de A2 recibía 201 —porque el endpoint no pedía autenticación de ninguna clase—,
así que **es una regresión funcional para ese rol**, no un fallo de seguridad. `ROLE_DESCRIPTIONS`
(`constants.ts:21`) además le promete «Gestión completa: … Participantes …».

Se mantiene `[ADMIN, OPERATOR]` por coherencia con `PUT`/`DELETE`, que ya excluían a `MANAGER`.
**Resolver esta entrada debe tocar a la vez** los tres verbos de escritura, `/api/events`, las
guardas de pantalla de **SB-19** y `ROLE_DESCRIPTIONS`; arreglar solo una parte deja el sistema
afirmando dos cosas distintas, que es como llegó hasta aquí.

**Consecuencia para A1**: los permisos de `MANAGER` que A1 concede son **hoy inertes**. Se
incluyeron igualmente porque la elección es dominante —si el rol está muerto no conceden nada a
nadie; si está vivo, omitirlos rompe su pantalla—, pero **la incoherencia real está en
`/api/events`, no en A1**.

**Decisión pendiente, y es de producto**: o `MANAGER` es un rol vivo, y entonces hay que añadirlo
a `/api/events` y a `schedules`; o no lo es, y hay que retirarlo de los `RoleGuard` que lo
prometen. Hoy el sistema afirma las dos cosas a la vez. Relacionado: `ASSIGNABLE_ROLES`
(`constants.ts:25`) solo ofrece `[ADMIN, GUARD]` en la pantalla de Usuarios, pero el servidor
acepta los cuatro roles (`authSchemas.ts:22`): `MANAGER` y `OPERATOR` no se pueden crear por UI
pero **sí por API**.

---

## SB-19 — Tres páginas que muestran PII sin guarda de rol

- **Referencia**: surgido en **A1** el **2026-07-27**.
- **Ficheros**: `src/app/participants/[participantId]/page.tsx`,
  `src/app/participants/[participantId]/edit/page.tsx`,
  `src/app/events/[eventId]/participants/page.tsx` (cero coincidencias de
  `RoleGuard`/`ProtectedRoute`), y `src/app/events/[eventId]/page.tsx:16`, que usa
  `ProtectedRoute` **sin** `allowedRoles` y por tanto deja pasar a cualquier rol autenticado
  (`ProtectedRoute.tsx:31`).
- **Bloquea el redespliegue**: **No.** **A1 ya cierra la fuga de datos en el servidor**, que es lo
  que importa; esto es coherencia de la UI.

Tras A1 el servidor responde `403` a quien no corresponda, así que **no hay fuga**. Lo que queda es
una arista fea: un `GUARDIA` que escriba la URL a mano ve el esqueleto de la página y un error de
carga en vez de una redirección. **Corrección**: `RoleGuard [ADMIN, MANAGER, OPERATOR]` en las tres
páginas y `allowedRoles` explícito en la cuarta.

---

## SB-20 — El cliente no distingue un 403, y la búsqueda se traga el error

- **Referencia**: surgido en **A1** el **2026-07-27**.
- **Ficheros**: `src/utils/apiClient.ts:71-80`, `src/store/participantStore.ts:89-92`,
  `src/components/accreditation/SearchParticipant.tsx:31-33`.
- **Bloquea el redespliegue**: **No.**

`apiClient` contempla `401`, `404` y `422`; **`403` cae en el `default`** y se degrada a un
`ServerError` genérico, indistinguible de un 500. Peor: `participantStore.searchParticipants`
**captura el error y devuelve `[]`**, y `SearchParticipant` lo vuelve a tragar. Un fallo de
permisos se presenta al usuario como **«No se encontraron resultados»**.

**Por qué se registra ahora.** Es la razón por la que un recorte de roles en estos endpoints sería
**invisible**: no falla ruidosamente, falla en silencio y parece un padrón vacío. Con W7 inoperante
(**SB-11**) y sin cobertura de tests en estos endpoints, no hay ninguna red que lo detecte.
**Corrección**: `case 403` con mensaje propio, y que la búsqueda distinga «sin resultados» de
«fallo».

---

## SB-21 — `GET /api/participants/[id]/guests` es un endpoint huérfano

- **Referencia**: surgido en **A1** el **2026-07-27**.
- **Ficheros**: `src/app/api/participants/[participantId]/guests/route.ts`.
- **Bloquea el redespliegue**: **No.**

**Cero consumidores en el cliente.** La UI lee los acompañantes por
`/api/participants/{id}?includeGuests=true` (`guestStore.ts:29`); el `POST` de esa misma ruta sí se
usa (`guestStore.ts:40`), el `GET` no. A1 lo ha protegido con `[ADMIN, MANAGER, OPERATOR]` —los
mismos roles que la ficha de la que es subconjunto—, que es lo correcto mientras exista.
**Evaluar si se elimina** en vez de mantener superficie sin función.

**De paso, en el endpoint hermano**: `participantStore.ts:64-70` envía `includeGuests`,
`includeAwards` e `includeSchedules` como query params, pero
`participants/[participantId]/route.ts` llama a `getParticipant(participantId, true, true)` con
booleanos fijos y **los ignora**. Contrato cliente-servidor desalineado; sin impacto de seguridad.

---

## SB-22 — El limitador comparte el pool de 5 conexiones de la aplicación

- **Referencia**: surgido en **A6** el **2026-08-05**. Quedó **fuera del alcance** de A6 (W2).
- **Ficheros**: `src/lib/auth-rate-limit.ts:52-54`, `src/lib/sequelize.ts:16-21`.
- **Bloquea el redespliegue**: **No.**

`RateLimiterPostgres` recibe la instancia de Sequelize de la aplicación, así que cada `consume()`
toma prestada una conexión del **mismo pool de 5** que sirve las consultas normales
(`sequelize.ts:17`, `pool.max: 5`). Justo bajo el flood que el limitador existe para frenar, el
limitador **compite por conexiones con la aplicación**.

No es un fallo de seguridad y el coste por petición es una consulta trivial sobre una tabla de
tres columnas con clave primaria, pero bajo carga sostenida es la clase de acoplamiento que
convierte un ataque de fuerza bruta en una degradación general.

**Corrección**: `pg` ya es dependencia directa, así que basta un `new Pool(...)` dedicado de 2
conexiones y pasarlo con `storeType: 'pool'`. Media hora, sin dependencias nuevas.

---

## SB-23 — Endpoint público de evento roto desde siempre y sin consumidores

- **Referencia**: surgido al preparar **A3** el **2026-08-05**. Es el 500 que quedó pendiente de
  diagnóstico al cerrar A1.
- **Ficheros**: `src/app/api/public/events/[slug]/route.ts:17-24`.
- **Bloquea el redespliegue**: **No.**

`GET /api/public/events/{slug}` devuelve **500 en toda petición, siempre**, con independencia del
slug y del estado de la base de datos. La causa es determinista: el `include` declara
`{ model: EventSchedule }` **sin `as`**, y la asociación está definida con alias obligatorio en
`EventSchedule.ts:110` (`as: 'schedules'`). Sequelize lanza `EagerLoadingError`, que cae en el
`catch` genérico y sale como 500. El comentario del propio fichero delata que quien lo escribió
estaba adivinando el alias. Todos los demás sitios del proyecto lo hacen bien.

**No es una regresión**: nunca funcionó. Y **no tiene ningún consumidor** — la landing
(`public/events/[slug]/page.tsx:11-43`) consulta la base de datos en servidor por su cuenta, y los
únicos `fetch` del cliente van a `/lookup` y `/register`. Es código muerto.

**Precisión para quien lo arregle**: añadir el `as` **no basta**. La lista `attributes` de `:25`
omite `maxGuestsPerParticipant`, `maxCapacity`, `publicTemplate` y `emailTemplateId`; un cliente
que lo consumiera vería `maxGuests = 0` y **la sección de invitados desaparecería**.

**Corrección**: decidir entre **borrarlo** (es lo que corresponde a código muerto que nunca
funcionó, y reduce superficie) o arreglar `as` **y** `attributes` a la vez.

---

## SB-24 — La capacidad del evento no cuenta invitados

- **Referencia**: surgido al preparar **A4** el **2026-08-05**.
- **Ficheros**: `src/services/capacityService.ts:4, 9-15, 21-28, 36-66`.
- **Bloquea el redespliegue**: **No.** Es una **decisión de producto**, no un fallo.

El plan de A4 hablaba de topar los invitados "por cupo del evento". Al verificarlo contra el
código resulta que **la capacidad no cuenta invitados en ninguna parte**: `capacityService` solo
consulta `participant_schedules`, y así está documentado en su propio comentario. Un evento con
`maxCapacity: 100` admite 100 participantes **más** sus acompañantes.

Por eso A4 topa los invitados **por participante** (`allowedGuests` y el máximo del evento), que
es una regla existente, y **no** por cupo del evento, que sería una regla nueva: cambiaría la
semántica de `spotsLeft` que la landing ya muestra al público.

**Decisión pendiente**: ¿la capacidad de una fecha debe contar las plazas físicas (participantes
+ invitados) o solo los inscritos? Si es lo primero, hay que revisar `capacityService` **y** el
mensaje de la landing a la vez.

---

## SB-25 — Un volcado con datos reales está versionado

- **Referencia**: surgido en la **revisión de despliegue** del **2026-08-05**. **La auditoría no lo
  detectó**: la Fase 2 buscó `.env` y patrones de secreto en el historial, y este fichero no es
  ninguna de las dos cosas.
- **Fichero**: `acreditacion_dump.sql`, **rastreado por git** en un repositorio público.
- **Bloquea el redespliegue**: **no técnicamente**, pero debe resolverse **antes** de clonar el
  repositorio en el droplet nuevo.

**Contenido, contado sin imprimirlo** (R2): **6 usuarios con sus hashes de contraseña**, **110
refresh tokens**, **360 registros de auditoría** y **3 empleados con RUT**.

**Por qué importa más de lo que parece.** La reconstrucción empieza por `git clone`, así que estos
datos aterrizan en el droplet nuevo y en cada máquina de desarrollo que toque el proyecto. Y el
fichero es una tentación evidente como bootstrap del esquema —no hay migraciones (**SB-26**)—, lo
que **repoblaría `refresh_tokens`**: si alguien reutilizara `JWT_REFRESH_SECRET`, esos 110 tokens
volverían a ser válidos. La plantilla de entorno ya avisa contra reutilizar secretos, pero el aviso
no sirve de nada si el vector no se conoce.

**Corrección**: `git rm --cached acreditacion_dump.sql`, añadirlo a `.gitignore`, y **decidir** si
se reescribe la historia. Los hashes son bcrypt con coste 12, así que no son de crackeo inmediato,
pero los RUT y los correos son datos personales y ya están publicados. El esquema debe venir de
migraciones, no de un volcado.

**Estado (2026-08-06, plan 08 fase 3 — P08-D12): parcialmente resuelta.** Hecho: el fichero ya
**no está rastreado** (`git rm --cached`, conserva la copia de trabajo local), `.gitignore` ignora
`*.sql` y `*.dump` con la excepción explícita como único camino de vuelta, y el esquema ya viene
de migraciones (`npm run db:migrate`, ver SB-26). Un `git clone` nuevo **ya no recibe el volcado
en el árbol de trabajo** — pero **sigue completo en la historia** (`git show` de cualquier commit
anterior lo recupera). La entrada queda **abierta** solo por lo que no se decide sin Emmanuel:

1. **Reescribir la historia** (`git filter-repo` o equivalente) para eliminarlo de todos los
   commits: invalida los clones existentes y no borra lo ya copiado del repositorio público.
2. **Rotar las contraseñas de los 6 usuarios del volcado**: sus hashes están publicados (bcrypt
   coste 12, no urgente, pero afecta a personas).

**Nota de discrepancia con la auditoría**: `AUDIT-FINDINGS.md` §Fase 2 dio el fichero por «solo
datos de prueba» por confirmación del usuario; la revisión de despliegue contó dentro 6 usuarios
con hashes, 110 refresh tokens, 360 registros de auditoría y 3 empleados con RUT. Esta entrada
—no aquella línea— es la que refleja el estado real.

---

## SB-27 — `GET /api/public/events/[slug]` devuelve 500 siempre: `include` sin alias

- **Referencia**: encontrado durante la verificación W3 de **R1-01** (plan 01, fase 1), 2026-08-06.
- **Fichero**: `src/app/api/public/events/[slug]/route.ts:17-24`.
- **Bloquea el despliegue**: **no** — hoy no lo llama nadie.

La asociación se declara con alias (`Event.hasMany(EventSchedule, { as: 'schedules' })`,
`src/models/EventSchedule.ts:110`) pero el `include` del handler no lo pasa:

```js
include: [{ model: EventSchedule }]   // sin `as: 'schedules'`
```

Sequelize lo rechaza con `SequelizeEagerLoadingError`, el `catch` lo convierte en 500 y el
endpoint **nunca ha podido responder 200**. Comprobado ejecutando:

```
GET /api/public/events/r101-cap0-mshf9a9a → 500 {"error":"Internal server error"}
```

**Por qué no es urgente y aun así hay que arreglarlo**: la landing pública **no** usa este
endpoint — `src/app/public/events/[slug]/page.tsx:19-25` hace su propia consulta y **sí** pasa
`as: 'schedules'`. Una búsqueda por los llamadores no encuentra ninguno. Es decir, es una ruta
pública muerta que solo sabe devolver 500.

**Corrección**: añadir `as: 'schedules'` al `include`, o **borrar la ruta** si se confirma que la
página cubre el caso. Lo segundo es preferible: una ruta pública sin usar es superficie de ataque
sin contrapartida.

**Comentario de método**: esto lo encontró la verificación de otra cosa. El fichero está
intacto desde `37f6060` y ningún test lo cubre — es exactamente el hueco que SB-11 deja abierto.

---

## SB-28 — El login distingue «cuenta deshabilitada» de «credenciales inválidas»: enumeración de estado de cuenta

- **Referencia**: encontrado durante la implementación de **R2-01** (plan 02, fase 1), 2026-08-06.
- **Ficheros**: `src/services/authService.ts:15-29`, `src/app/api/auth/login/route.ts` (rama del 401).
- **Bloquea el despliegue**: **no** — requiere conocer email Y contraseña, y el limitador lo frena.

`authService.login` lanza `Invalid credentials` cuando el email no existe o la contraseña no
coincide —el comentario del código dice explícitamente que es «para prevenir enumeración»— pero
lanza **`User account is disabled`** cuando la cuenta existe, la contraseña ES correcta y está
desactivada. El handler devuelve ambos mensajes tal cual en el cuerpo del 401.

Quien posea una credencial robada puede distinguir «contraseña incorrecta» de «contraseña
correcta pero cuenta desactivada», es decir, **confirmar que una credencial filtrada era válida**
aunque la cuenta ya esté suspendida. Es información útil para reutilizarla en otros servicios
(password reuse), que es justo el escenario post-compromiso de esta auditoría.

**Corrección propuesta**: devolver el mismo mensaje genérico en ambos casos y conservar la
distinción solo en el registro de auditoría (que ya existe: `auditLogService.log` con
`reason: 'User account is disabled'`). Encaja en el plan 04 (fugas de detalle en errores).

**Nota de alcance (W2)**: se detectó al decidir qué caminos de fallo consumen cuota en R2-01
(ambos consumen, así que el limitador sí lo frena); cambiar el mensaje era tocar contrato de
respuesta fuera del alcance de la fase.

---

## SB-29 — Dos logins (o refresh) del mismo usuario en el mismo segundo → 500 por token idéntico

- **Referencia**: encontrado durante la verificación W3 de **R2-02** (plan 02, fase 2), 2026-08-06.
- **Ficheros**: `src/lib/jwt.ts:16-20` (`generateTokens`), `src/services/authService.ts`
  (`login` y `refreshAccessToken`, ambos hacen `RefreshToken.create`), modelo `RefreshToken`
  (unique sobre `token`).
- **Bloquea el despliegue**: **no** — requiere coincidencia al segundo del MISMO usuario, pero es
  alcanzable con uso normal (dos pestañas, doble clic en «Entrar», dos puestos con cuenta
  compartida).

El payload del JWT solo contiene `id, role, email, username` más `iat`/`exp`, y `iat` tiene
resolución de **1 segundo**: dos `jwt.sign` del mismo usuario dentro del mismo segundo producen
**bytes idénticos**. El segundo `RefreshToken.create` choca con la unique
`refresh_tokens_token_key` y el error sale como **500** en `/api/auth/login` (observado con dos
logins consecutivos del usuario `acreditador` a <1 s) o como **401** en `/api/auth/refresh` (el
`catch` genérico lo convierte en 401 con el mensaje de Sequelize en el cuerpo — que además filtra
el token en el `detail` del error al log).

**Corrección propuesta**: añadir un claim `jti` (UUID) al refresh token en `generateTokens`, que
además es lo que la rotación necesita para ser robusta. Alternativa mínima: capturar la violación
de unique y reutilizar la fila existente (mismo token = misma sesión lógica).

---

## SB-30 — El cliente descarta el refresh token rotado: cierre de sesión forzoso en el segundo refresh

- **Referencia**: encontrado durante la verificación W3 de **R2-02** (plan 02, fase 2), 2026-08-06.
- **Ficheros**: `src/store/authStore.ts:78-91` (`refreshAuthToken`, solo guarda `accessToken`),
  frente a `src/services/authService.ts:107-125` (rota: revoca el usado y devuelve
  `refreshToken` nuevo).
- **Bloquea el despliegue**: **no**, pero es una regresión funcional visible: con `JWT_EXPIRES_IN`
  corto, el usuario acaba expulsado en el **segundo** ciclo de refresh.

El servidor rota el refresh token (revoca el usado, devuelve uno nuevo en `data.refreshToken`),
pero `refreshAuthToken` solo hace `set({ accessToken })`: el cliente conserva el token **ya
revocado**. El primer refresh funciona; el segundo devuelve 401 (`Invalid or revoked refresh
token`) y el `catch` ejecuta `logout()`. Verificado en W3 de R2-02: reutilizar el token tras un
refresh → 401; adoptando el rotado → 200 siempre.

Hoy se disimula porque el valor por defecto de `JWT_EXPIRES_IN` son **7 días** (`jwt.ts:5`) y
nadie aguanta la pestaña abierta tanto tiempo — pero **SB-07 propone acortar la vida del access
token apoyándose en «la rotación de refresh que ya funciona correctamente»**: funciona en el
servidor, no en el cliente. Acortar el token sin arreglar esto convierte cada expiración par en
un logout.

**Corrección propuesta**: `set({ accessToken, refreshToken: response.data.refreshToken })` en
`refreshAuthToken` (el dato ya viaja en la respuesta). Un cambio de una línea, pero toca el flujo
de sesión: probar el ciclo doble de refresh al hacerlo.

---

## SB-31 — Esquemas de login duplicados y ya divergentes: dos `loginSchema` y dos `registerSchema`

- **Referencia**: encontrado durante la implementación de **R2-03a** (plan 02, fase 3), 2026-08-06.
- **Ficheros**: `src/utils/validators/authSchemas.ts` (lo usan el servidor: `login/route.ts`,
  `authService`, `authStore`) y `src/utils/validators/userSchemas.ts` (lo usa el formulario:
  `LoginForm.tsx`).
- **Bloquea el despliegue**: no.

Hay dos `loginSchema` y dos `registerSchema` con el mismo nombre en ficheros distintos, y ya han
divergido: el `registerSchema` de `authSchemas` exige 8 caracteres y 4 clases; el de `userSchemas`
solo 8 caracteres. R2-03a tuvo que añadir el `.max(254)` del email **en los dos** `loginSchema`
para que el formulario y el servidor contaran lo mismo — ese parcheo por duplicado es exactamente
el modo de fallo que la duplicación garantiza a futuro: quien toque uno no sabrá que existe el
otro. **Corrección propuesta**: un único módulo de esquemas de auth importado por ambas capas
(~30 min; revisar también la relación con D2.6, la política de contraseñas partida).

---

## SB-33 — Next 16 declara obsoleta la convención `middleware`: la fuente única de CORS vive en una API en retirada

- **Referencia**: encontrado durante la implementación de **P08-D1** (plan 08, fase 1), 2026-08-06.
- **Ficheros**: `src/middleware.ts` (convención `middleware`, matcher `/api/:path*`) y
  `src/middleware/security.ts`.
- **Bloquea el despliegue**: no.

Cada `next build` avisa: *«The "middleware" file convention is deprecated. Please use "proxy"
instead»*. Tras P08-D1/D8.2, ese fichero es la **fuente única** de CORS (y de las cabeceras de
seguridad de `/api`): el día que una versión de Next retire la convención, el build seguirá
compilando la aplicación pero **sin CORS ni límites de tasa**, que es exactamente la degradación
silenciosa que esta remediación combate. **Corrección propuesta**: migrar a la convención `proxy`
siguiendo la guía oficial y re-ejecutar la batería W3 de CORS y rate-limit (~1 h). Conviene
hacerlo antes de la siguiente subida de versión de Next.

---

## SB-34 — El build avisa «Encountered unexpected file in NFT list» por la ruta de subidas

- **Referencia**: visto de camino en **P08-D6** (plan 08, fase 2), 2026-08-06.
- **Ficheros**: `src/app/api/uploads/route.ts` (traza del aviso) y
  `src/utils/uploadsStorage.ts`; lo emite `next build` (Turbopack).
- **Bloquea el despliegue**: no.

Cada `next build` emite un warning NFT — *«A file was traced that indicates that the whole
project was traced unintentionally»* — con traza a `api/uploads/route.ts`: el trazador de
ficheros ve operaciones `path.join`/fs sobre rutas que solo se conocen en ejecución
(`UPLOADS_DIR` sale del entorno; ese diseño es correcto y es D6). Se probó el remedio que
sugiere el propio warning (`/*turbopackIgnore: true*/` en los `path.join` de
`uploadsStorage.ts`) y **no lo silencia** — el disparador parece estar en las llamadas fs del
propio handler. Sin efecto en el despliegue actual (no se usa `output: standalone`); si algún
día se adopta standalone, ese trazado engordaría el artefacto. **Corrección propuesta**: acotar
las operaciones fs de las rutas de uploads con `turbopackIgnore` (incluido el handler) o mover
la resolución a un módulo de ruta estática, y comprobar que el warning desaparece (~30 min).
