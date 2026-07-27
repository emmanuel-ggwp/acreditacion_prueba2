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
| [SB-13](#sb-13--postcss-sin-parchear-y-la-trampa-de-npm-audit-fix---force) | `postcss` sin parchear, y la trampa de `npm audit fix --force` | — (surgido en A7) | ~1 h |
| [SB-14](#sb-14--params-tratado-como-objeto-sincrono-en-awardspagetsx) | `params` tratado como objeto síncrono en `awards/page.tsx` | — (surgido en A7) | ~15 min |
| [SB-15](#sb-15--el-script-lint-no-existe-desde-nextjs-16) | El script `lint` no existe desde Next.js 16 | — (surgido en A7) | ~15 min |

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

- **Acción**: `npm update postcss` para la copia top-level; vigilar el pin de Next para la
  anidada; y dejar constancia en el runbook de reconstrucción de que `npm audit fix --force`
  está **prohibido** en este proyecto. Si se añade `npm audit` a CI (§7.4), configurarlo en modo
  informe, nunca con corrección automática.

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
