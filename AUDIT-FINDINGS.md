# Hallazgos de auditoría — 2026-07-26

> Estado: **AUDITORÍA COMPLETA — Fases 0 a 7.** Cerrada el 2026-07-27.
> Regla R2 activa: en este documento no aparece el valor de ningún secreto,
> solo nombres de variables, rutas y metadatos.
>
> **Si solo vas a leer una sección, lee la [Fase 7](#fase-7--reporte-y-plan-de-remediación):**
> veredicto, inventario de los 41 hallazgos y plan de remediación priorizado. Está escrita para
> leerse sin el resto del documento. Las Fases 0-6 son el trabajo que la sostiene.

---

## Inventario (Fase 0)

Solo hechos verificados. Sin juicios de severidad todavía.

### 1. Estructura del proyecto

| Dato | Valor | Evidencia |
|---|---|---|
| Framework | Next.js | `package.json:70` |
| Router | **App Router** (`src/app/`) | `src/app/layout.tsx`; no existe `src/pages/` ni `pages/api/` |
| Directorio fuente | `src/` | `tsconfig.json`, árbol del repo |
| Gestor de paquetes | **npm** | solo `package-lock.json` (lockfileVersion 3); no hay `yarn.lock`, `pnpm-lock.yaml` ni `bun.lockb` |
| Lenguaje | TypeScript 5.9.3 | `package.json:42` |
| Middleware | **Sí — `src/middleware.ts`** (909 bytes, mtime 2025-11-29) | contenido no analizado aún; se analiza en Fase 1/3 |
| Server Actions | **0 archivos** con directiva `'use server'` | `grep -rl` sobre `src/**/*.{ts,tsx}` |

### 2. Versiones (rango declarado vs. resuelto en lockfile)

| Paquete | Rango en `package.json` | Versión resuelta en `package-lock.json` |
|---|---|---|
| `next` | `^16.0.5` | **16.0.6** |
| `react` / `react-dom` | `^19.2.0` | 19.2.0 |
| `sequelize` | `^6.37.7` | 6.37.7 |
| `sequelize-typescript` | `^2.1.6` | — |
| `next-auth` | `^4.24.13` | 4.24.13 |
| `jsonwebtoken` | `^9.0.2` | 9.0.2 |
| `pg` | `^8.22.0` | — |

ORM: **Sequelize 6** + `sequelize-typescript`, driver PostgreSQL (`pg`, `pg-hstore`).
Versión de Node: **no declarada** — no hay campo `engines` en `package.json`, ni `.nvmrc`, ni `.node-version`. No se puede determinar desde el repo qué Node corría en el VPS.

Coexisten dos capas de auth en las dependencias: `next-auth@4` y `jsonwebtoken`+`bcryptjs` (con `src/lib/jwt.ts` y `src/app/api/auth/*` propios). Cuál estaba realmente en uso se determina en Fase 3.

### 3. Modo de despliegue

**No hay ningún artefacto de despliegue versionado en el repositorio.** Búsqueda hasta profundidad 3, excluyendo `node_modules/`, `.git/` y `.next/`:

- `Dockerfile` — no existe
- `docker-compose.yml` / `.yaml` — no existe
- `ecosystem.config.js` (PM2) — no existe
- `nginx.conf` o cualquier config de nginx — no existe
- `*.service` (systemd) — no existe
- `.github/workflows/` — **el directorio `.github/` no existe**; no hay CI/CD versionado
- Ningún archivo `.sh`, `.yml` ni `.yaml` en todo el árbol del proyecto

Los scripts de `package.json:5-16` son los estándar de Next (`next dev` / `next build` / `next start`) más scripts de base de datos vía `tsx`. `next.config.js` **no** define `output: 'standalone'`.

**Consecuencia para la auditoría:** la configuración del servidor (nginx, systemd/PM2, Docker, firewall, TLS) vivía únicamente en el VPS destruido. La Fase 6 tendrá alcance reducido a `next.config.js` y quedará como pregunta abierta al usuario.

El único archivo de arranque presente es `.claude/launch.json` — configuración local de Claude Code (`npm run dev`, puerto 3000), no de producción.

### 4. Fechas

| Hito | Fecha |
|---|---|
| Último commit (`ba86234`, merge de PR #5) | **2026-07-07** |
| Último commit que modificó `package-lock.json` (`21b6d43`) | **2026-07-03** |
| mtime de `package-lock.json` en disco | 2026-07-03 |
| mtime de `.next/` (build local) | 2026-07-07 |
| Commit que añadió `.env` al repo (`37f6060`, autor: Alba Diaz) | **2026-07-01** |

Autores en los últimos commits: `Alba Diaz`, `emmanuel-ggwp`, `emmanuelmarcano`. Pendiente de confirmar con el usuario que los tres son legítimos (Fase 5).

Ventana relevante: el incidente se sitúa en julio de 2026 y la actividad del repo se detiene el 2026-07-07.

### 5. Archivos de configuración presentes en el repo

| Archivo | Rastreado por git | Nota |
|---|---|---|
| `next.config.js` | sí | rewrites, headers de seguridad, webpack, `serverExternalPackages` |
| `tsconfig.json` | sí | |
| `jest.config.js`, `jest.setup.js` | sí | |
| `postcss.config.js`, `tailwind.config.js` | sí | |
| `.gitignore` | sí | incluye `.env*` en línea 16 |
| `.example.env` | sí | plantilla, esperado |
| `.claude/launch.json` | sí | config local de dev |

### 6. Hechos que condicionan las fases siguientes

Los siguientes hechos se registran ahora sin calificarlos; se evalúan en su fase correspondiente.

1. **`.env` está rastreado por git** (`git ls-files --error-unmatch .env` → coincide), pese a que `.gitignore:16` contiene `.env*`. Fue añadido en el commit `37f6060` del 2026-07-01. `.gitignore` no surte efecto sobre archivos ya rastreados. Presente también en el árbol de trabajo (663 bytes, mtime 2026-07-03). → **Fase 2**, con prioridad.
2. **`acreditacion_dump.sql` está rastreado por git** (180.742 bytes, mtime 2026-07-03): volcado de la base de datos en el repositorio. Contenido no inspeccionado. → **Fase 2**.
3. Archivos de log en el árbol de trabajo, **no** rastreados (cubiertos por `*.log` en `.gitignore`): `auth-debug.log` (19.217 bytes, 2026-01-04) y `sequelize-debug.log` (1.776 bytes, 2026-01-03). Sus nombres sugieren que pueden contener material de autenticación. No se ha leído su contenido. → **Fase 2**.
4. `uploads/` (raíz, ignorado) y `public/uploads/` (contenido ignorado, solo `.gitkeep` rastreado) existen. `next.config.js:14-16` reescribe `/uploads/:file` → `/api/uploads/:file`. → **Fases 3 y 4**.
5. **52 archivos `route.ts`** bajo `src/app/api/` rastreados. Clasificación por auth pendiente de Fase 3; el número de *rutas* puede diferir del de *archivos* según los métodos HTTP exportados por cada uno.
6. `next.config.js:27` fija `Access-Control-Allow-Origin` a `process.env.ALLOWED_ORIGIN || "*"` junto a `Access-Control-Allow-Credentials: true`. → **Fase 6**.
7. `next.config.js` no define `redirects()` — solo `rewrites()`. Dado que el síntoma reportado del ataque fue una redirección de dominio, esto es relevante: el origen de esa redirección no está en la configuración de Next versionada. → **Fase 6**.
8. **No hay** `.next/` ni ningún build rastreado por git. El `.next/` local es un build de desarrollo del 2026-07-07. → **Fase 5**.

### 7. Aplicación de R5 en esta fase

No se ha encontrado en el árbol del proyecto ningún binario, script suelto no reconocible, webshell ni archivo ofuscado. Los archivos inesperados listados en §6 (`.env` rastreado, volcado SQL, logs de auth) encajan con un patrón de higiene de repositorio deficiente, no con material plantado por un tercero. **No se activa la detención total de R5 en la Fase 0.** La verificación de integridad formal es la Fase 5.

---

## Addendum al plan (2026-07-26)

**A1. Correcciones de contexto confirmadas por el usuario.** Los dos hallazgos de higiene
de la Fase 0 quedan **descartados como vector de entrada**:
- `.env` versionado contiene valores de **desarrollo**; los secretos de producción eran distintos y nunca estuvieron en el repositorio.
- `acreditacion_dump.sql` contiene **solo datos de prueba**; no hay filtración de datos reales.

Ambos siguen siendo deuda de higiene (severidad **baja**, no crítica) y se mantienen en el
plan de remediación por corrección de proceso, no por impacto.

**A2. Punto 7 añadido a la Fase 3** (valores de respaldo en secretos de firma).
`AUDIT-PLAN.md` **no existe en el repositorio** — nunca se copió a la raíz —, así que el
punto no pudo añadirse a ese archivo. Queda registrado aquí como parte del alcance
pendiente de la Fase 3. **Adelanto de resultado:** por su relevancia directa para la Fase 1
(§1.4), el patrón de respaldo ya se verificó; ver hallazgo **F1-05**.

---

## Fase 1 — Versión y CVEs conocidos

### 1. Veredicto explícito

> **¿Era la versión desplegada vulnerable a un CVE con exploit público?**
> **SÍ, la versión es vulnerable** a un conjunto de advisories de severidad crítica.
> **NO he podido confirmar que ese sea el vector del compromiso**, y la superficie
> concreta que esos advisories abren en *esta* aplicación es más estrecha de lo que
> el planteamiento inicial suponía.

**Versión confirmada:** `next@16.0.6` resuelto en `package-lock.json` (lockfileVersion 3).
`package.json:70` declara el rango `^16.0.5`, que resuelve a 16.0.6 en el lockfile.

**Exposición según `npm audit --omit=dev`:** el paquete `next` aparece marcado como
**critical**, con rango vulnerable `9.3.4-canary.0 - 16.3.0-preview.7`. **16.0.6 está
dentro del rango.** El bloque agrupa ~35 advisories, entre ellos:

| Advisory | Relevancia en esta app |
|---|---|
| **GHSA-9qr9-h5gf-34mp — «React2Shell» — RCE sin autenticación en el protocolo React Flight. CVSS 10.0. Publicado 2025-12-03. Corregido en 15.0.5 / 15.1.9 / 15.2.6 / 15.3.6 / 15.4.8 / 15.5.7 / **16.0.7**. Rango afectado: 15.0.0 – 16.0.6.** *(Sobre la relación con CVE-2025-55182, ver la nota justo debajo de la tabla: **no son el mismo identificador**.)* | **SUPERFICIE PRESENTE Y CONFIRMADA. Vector principal.** Deserialización insegura en el protocolo Flight de RSC; se dispara con **una sola petición POST manipulada**, sin autenticación previa. **No requiere** Server Actions, Image Optimizer ni bypass de middleware — basta App Router con RSC, que es exactamente lo que usa esta app. La versión desplegada, **16.0.6, está una única versión de parche por debajo del fix (16.0.7)**. Ver §7. |
| GHSA-c4j6-fc7j-m34r — **SSRF vía WebSocket upgrades** (el CVE-2026-44578 del plan) | Superficie **presente si** corría con `next start`. Ver §2. |
| GHSA-267c-6grr-h53f, GHSA-26hh-7cqf-hhc6, GHSA-492v-c6pp-mqqv, GHSA-6gpp-xcg3-4w24, GHSA-36qx-fr4f-26g5 — **bypass de Middleware / Proxy** | **Impacto degradado en esta app.** Ver §3: el middleware no autentica. |
| GHSA-3g8h-86w9-wvmq, GHSA-vfv6-92ff-j949, GHSA-wfc6-r584-vfw7, GHSA-68g3-v927-f742 — cache poisoning de RSC / respuestas | Superficie presente; requiere capa de caché intermedia para impacto real (no verificable desde el repo). |
| GHSA-ffhc-5mcf-pf4q — XSS vía nonces de CSP | **No aplica.** La CSP de `next.config.js:33` y `src/middleware/security.ts:18` es estática, sin nonces (usa `'unsafe-inline'`). |
| GHSA-w37m-7fhw-fmv9, GHSA-mq59-m269-xvcx, GHSA-m99w-x7hq-7vfj, GHSA-955p-x3mx-jcvp — Server Actions (exposición de código, CSRF, DoS) | **No aplican.** La app tiene **0 Server Actions** (`grep -rl "'use server'"` → 0 archivos). |
| GHSA-9g9p-9gw9-jx7f, GHSA-h64f-5h5j-jqjh, GHSA-q8wf-6r8g-63ch, GHSA-3x4c-7xq6-9pq8 — Image Optimizer | **No aplican / superficie mínima.** `next.config.js` no define bloque `images` ni `remotePatterns`. |
| GHSA-p9j2-gv94-2wf4 — **SSRF en rewrites vía hostname de destino controlado por atacante** | **No aplica.** El único rewrite (`next.config.js:14-16`) tiene destino estático interno `/api/uploads/:file`, sin interpolación de host. |
| GHSA-ggv3-7p47-pfv8 — HTTP request smuggling en rewrites | Superficie presente (hay un rewrite activo). No verificable desde el repo. |

> **Rectificación de identificadores (2026-07-27) — `GHSA-9qr9-h5gf-34mp` y `CVE-2025-55182` NO
> son intercambiables.** Este informe los presentó como equivalentes (`=`). Consultada la API de
> GitHub, la equivalencia no se sostiene:
>
> | Identificador | Lado | Paquetes afectados | Parche relevante aquí |
> |---|---|---|---|
> | **`GHSA-9qr9-h5gf-34mp`** | **Next.js** | `next` | **16.0.7** en la rama 16 |
> | **`CVE-2025-55182`** → `GHSA-fv66-9v8q-g76r` | **React** | `react-server-dom-webpack`, `react-server-dom-turbopack`, `react-server-dom-parcel` | — |
>
> La API devuelve **`cve_id: null`** para `GHSA-9qr9-h5gf-34mp`: no tiene CVE asignado.
> `CVE-2025-55182` mapea a un advisory **distinto**, del lado de React.
>
> **Es la misma vulnerabilidad de fondo** —RCE en el protocolo Flight de React Server
> Components, divulgada popularmente como **React2Shell**— y **no cambia nada práctico**: el
> advisory que aplica a este repositorio es el del lado Next.js, su parche en la rama 16 sigue
> siendo **16.0.7**, y `next` vendoriza `react-server-dom-*` en `dist/compiled` sin entrada
> propia en el lockfile. Lo que cambia es que **quien consulte este informe dentro de seis meses
> necesita poder llegar a los dos advisories**, y con la equivalencia escrita solo llegaba a uno.
>
> Donde este documento diga «CVE-2025-55182» a secas —§1 más abajo, §7.1, §7.5— léase **la
> vulnerabilidad**, no el identificador del advisory de Next. Registrado en §7.0 como sexta
> corrección.

**Versión objetivo — resuelto (2026-07-26).** La tabla de umbrales del plan de auditoría
(15.5.16 / 16.2.5 / 16.2.6) era **incorrecta**: omitía CVE-2025-55182, que es el advisory más
severo del conjunto y el único cuyo parche estaba a una sola versión de distancia de la
desplegada. La discrepancia detectada entre esa tabla y el rango de npm venía precisamente de
esa omisión. **Se descarta la tabla del plan.**

- **Mínimo absoluto de la rama 16: `16.0.7`** — cierra CVE-2025-55182 (React2Shell).
- **Recomendación de redespliegue:** la **última estable de la rama 16**, no el mínimo. El
  rango vulnerable agregado de npm llega hasta `16.3.0-preview.7`, de modo que existen
  advisories posteriores a 16.0.7 que 16.0.7 no cubre. La versión concreta debe confirmarse
  contra el advisory en el momento del redespliegue.

*Procedencia del dato:* fechas, CVSS y versiones de corrección de CVE-2025-55182 aportados por
el usuario el 2026-07-26 (Cloudflare, Trend Micro, Rescana, catálogo KEV de CISA). No
verificados de forma independiente desde este entorno.

### 2. Aplicabilidad real de la SSRF por WebSocket (GHSA-c4j6-fc7j-m34r)

- **¿La app usa WebSockets?** No encontré uso de WebSocket en el código de aplicación.
  `src/components/reports/RealtimeStats.tsx` y `src/app/api/reports/realtime/[eventId]/route.ts`
  existen, pero el endpoint es una ruta HTTP `route.ts` convencional (verificación completa
  de su mecanismo queda para la Fase 3).
- **¿Corría con el servidor Node integrado?** `package.json:8` define `"start": "next start"`
  y `next.config.js` **no** usa `output: 'standalone'`. Es el modo por defecto y el más
  probable, **pero no hay ningún artefacto de despliegue en el repo que lo confirme**
  (Fase 0 §3). → **No verificable desde el código.**
- **Conclusión:** si corría bajo `next start`, la superficie del handler de upgrade existe
  a nivel de servidor **aunque la app no use WS**. Clasificación honesta:
  *no pude verificar el modo de arranque real.*

> **CERRADO (2026-07-27, Fase 7 P3) — la condición se cumplía.** El usuario confirmó que la
> aplicación corría con **PM2 ejecutando `next start`, detrás de Nginx**, sobre Ubuntu 24.04. Por
> tanto **el servidor Node integrado de Next estaba en uso y la superficie del handler de upgrade
> WebSocket existía**. Este punto deja de ser *"no verificable desde el código"* y pasa a
> **verificado**; la vía se confirma como **abierta**, no como descartada. No altera el veredicto
> sobre el vector —React2Shell sigue siendo la hipótesis principal por su severidad, su fecha y
> su explotación masiva—, pero **elimina una atenuación** que hasta ahora se apoyaba en una
> incógnita.

### 3. El middleware NO es la capa de autorización — hallazgo que reorienta la fase

Esta es la corrección más importante de la Fase 1 respecto a la hipótesis de partida.

`src/middleware.ts` (29 líneas, matcher `'/api/:path*'`) hace **exactamente dos cosas**:
1. `rateLimitMiddleware` (`src/middleware.ts:7`)
2. `securityMiddleware` — cabeceras de seguridad y CORS (`src/middleware.ts:16`)

**No lee tokens. No valida sesiones. No decide autorización.** La autenticación vive en
`src/middleware/auth.ts` — que pese al nombre **no es middleware de Next**, sino un
decorador `withAuth(handler, roles)` aplicado dentro de cada `route.ts`.

**Consecuencia directa:** un bypass de middleware (GHSA-267c-6grr-h53f y familia) en esta
aplicación **no produce un bypass de autenticación**. Produce:
- evasión del rate limiting → habilita fuerza bruta contra `/api/auth/login`
- pérdida de cabeceras de seguridad y CORS en la respuesta

Es un impacto real, pero **no es acceso autenticado**. Cualquier reporte que presente el
bypass de middleware como la vía de entrada a datos estaría sobredimensionando el hallazgo.

**Respuesta a la pregunta de diseño del plan:** el diseño de auth **no dependía del
componente vulnerable**. En este punto concreto la arquitectura es más robusta de lo que
el plan asumía.

### 4. Clasificación de las 52 rutas por capa de verificación (conteo descompuesto)

Cobertura: **52/52 archivos `route.ts`** (no es una muestra).

**42 rutas** aplican `withAuth` → verificación **dentro del handler** (correcto por diseño).
**10 rutas** no lo aplican, y **ninguna de ellas usa otro mecanismo** (`grep` de
`verifyAccessToken|getServerSession|authorization` sobre esas 10 → **0 coincidencias**):

| Ruta | Clasificación |
|---|---|
| `src/app/api/auth/login/route.ts` | pública por diseño |
| `src/app/api/auth/logout/route.ts` | pública por diseño |
| `src/app/api/auth/refresh/route.ts` | pública por diseño (valida refresh token) |
| `src/app/api/public/events/[slug]/route.ts` | pública por diseño |
| `src/app/api/public/events/[slug]/lookup/route.ts` | pública por diseño |
| `src/app/api/public/events/[slug]/register/route.ts` | pública por diseño |
| `src/app/api/uploads/[filename]/route.ts` | pública por diseño (documentado en el propio archivo; guarda de traversal correcta, ver F1-04) |
| `src/app/api/health/route.ts` | pública — verificar exposición de datos internos (Fase 3) |
| `src/app/api/accreditations/stats/route.ts` | **sin auth, lee la BD** → F1-02 |
| `src/app/api/participants/route.ts` | **sin auth, escribe en la BD** → **F1-01** |

**Desglose: 52 rutas = 42 con auth en el handler + 7 públicas por diseño + 1 pública a
revisar (`health`) + 2 sin auth que tocan la base de datos.**
**0 rutas dependen del middleware para autorización.**

> ⚠️ **CORRECCIÓN (2026-07-26, Fase 3 §2) — este conteo es ERRÓNEO y queda anulado.**
> Se midió **por fichero** (`grep -l withAuth`), no **por método HTTP exportado**. Varios
> ficheros mezclan handlers protegidos y sin proteger: p. ej.
> `src/app/api/participants/[participantId]/route.ts` tiene `PUT` y `DELETE` con `withAuth`
> pero un **`GET` sin ninguna protección**, y el fichero contaba como "protegido".
> **Conteo correcto: 81 handlers = 68 con `withAuth` + 13 sin.** Las rutas sin auth que tocan
> la base de datos no son 2 sino **5**. Ver **Fase 3 §2** para la medición correcta y
> **F3-01** para la cadena de exfiltración que esto habilita. El resto de conclusiones de esta
> sección (0 rutas dependen del middleware, auth dentro del handler) se mantienen válidas.

### 5. Conflicto next-auth vs. JWT propio — resuelto

`next-auth@4.24.13` está declarado en `package.json:71` pero **ningún archivo de `src/` lo
importa** (`grep -rl "next-auth" src` → **0 archivos**). No hay `[...nextauth]/route.ts`.

- **Sistema activo:** implementación propia — `src/lib/jwt.ts` + `withAuth` de
  `src/middleware/auth.ts`, con `jsonwebtoken` y `bcryptjs`.
- **Rutas huérfanas del sistema antiguo:** **ninguna.** No hay migración a medias.
- **Tokens intercambiables:** no aplica; solo hay un emisor y un verificador.

`next-auth` es **dependencia muerta** (superficie de dependencia innecesaria, severidad
baja), no un vector. Esta línea de investigación queda cerrada.

### 6. Hallazgos de la Fase 1

#### F1-01 — CRÍTICO — `POST /api/participants` crea registros sin autenticación
`src/app/api/participants/route.ts:7-22`
El handler **no aplica `withAuth`**. Lee `userId` **del cuerpo de la petición**
(`route.ts:9-10`) y lo pasa como autor a `participantService.createParticipant(...)`
(`route.ts:17`). El único control es `if (!userId) → 401` (`route.ts:12-14`): comprueba que
el atacante *envió* un identificador, no que sea *suyo* ni que exista sesión.
**Impacto:** cualquiera en Internet puede escribir en la tabla de participantes atribuyendo
el registro a cualquier `userId` — inserción de datos arbitrarios y envenenamiento de la
traza de auditoría. **Esto es explotable y la prueba está en el código.**
**Corrección:** envolver en `withAuth` y derivar `userId` del token verificado, nunca del body.

#### F1-02 — ALTO — `GET /api/accreditations/stats` expone datos sin autenticación
`src/app/api/accreditations/stats/route.ts:7-33`
Sin `withAuth`. Acepta `eventId` por query string y consulta `Accreditation` y
`EventSchedule` (`route.ts:16-29`). Permite enumerar eventos y extraer volumetría de
acreditaciones sin credenciales. Además, `route.ts:32` devuelve `error.message` crudo al
cliente → filtración de detalles internos. **Explotable; sin evidencia de explotación.**

#### F1-03 — ALTO — El rate limiting no protege contra fuerza bruta
`src/lib/rate-limit.ts:4-7, 10`
Tres defectos acumulados:
1. **Límite inoperante:** `points: 1000, duration: 6` ⇒ ~166 req/s por IP. El comentario del
   propio código dice "10 requests / per 60 seconds" — **el código no hace lo que documenta**.
2. **Identidad falsificable:** la IP sale de `x-forwarded-for` (`rate-limit.ts:10`) sin lista
   de proxies de confianza. Rotando la cabecera, el límite se evade por completo.
3. **Almacén en memoria:** `RateLimiterMemory` (`rate-limit.ts:4`) no se comparte entre
   procesos y se reinicia con la app.
**Impacto:** `/api/auth/login` quedaba efectivamente sin protección contra fuerza bruta y
password spraying. **Mala práctica con explotabilidad demostrable; no encontré evidencia de
que se explotara** (requeriría logs del servidor).
**Nota para el veredicto:** esta es una vía de entrada que **no necesita ningún CVE**.

#### F1-04 — INFORMATIVO (control correcto) — traversal en `/api/uploads` mitigado
`src/utils/uploadsStorage.ts:33-41`
`safeFilename` aplica lista blanca `/^[a-zA-Z0-9._-]+$/`, rechaza `..`, `/` y `\`, y exige
extensión en `EXT_MIME`. La ruta pública `src/app/api/uploads/[filename]/route.ts:30`
compone con `path.join` tras esa validación. **No encontré traversal aquí.**

> **Matiz de alcance (2026-07-27, Fase 7 §7.0) — la guarda es correcta, pero no era la que
> protegía la lectura en producción.** El usuario informó de que en el despliegue anterior los
> ficheros subidos se servían mediante un **enlace simbólico dentro de `public/`** hacia una
> carpeta externa. Eso **confirma empíricamente** lo deducido en la Fase 6 §3 sobre el orden de
> `afterFiles`: los estáticos ganaban al rewrite `/uploads/:file` → `/api/uploads/:file`, de modo
> que **el handler `src/app/api/uploads/[filename]/route.ts` —y con él `safeFilename`— NO estaba
> en el camino de lectura**. La clasificación **no cambia**: el control sigue siendo correcto y
> sigue siendo válido para el camino que sí lo atraviesa. Lo que cambia es qué se creía que
> protegía. Especificación de reemplazo en **§7.4**.

#### F1-05 — POSITIVO con reserva — no hay secreto de respaldo (punto 7 de Fase 3, adelantado)
`src/lib/jwt.ts:4, 6`
El patrón es `process.env.JWT_SECRET!` y `process.env.JWT_REFRESH_SECRET!`. **No existe
ningún fallback** (`|| '...'`, `??`, ni constante por defecto). Verificado en todo el módulo.
Los que sí tienen respaldo son `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`
(`jwt.ts:5, 7`) — duraciones, **no material de firma**. Riesgo nulo.
- **Si la variable falta o está vacía:** el `!` de TypeScript es solo de compilación; en
  ejecución `jsonwebtoken` recibe `undefined`/`''` y **lanza**. En `verifyAccessToken`
  (`jwt.ts:30-36`) la excepción se captura y devuelve `null` ⇒ `withAuth` responde **401**.
  **Falla en cerrado, no en abierto. No hay bypass silencioso.**
- **Reserva:** **no aborta el arranque.** El fallo aparece en la primera petición, no al
  desplegar; una variable mal cargada degrada la app a "nadie puede autenticarse" sin señal
  clara. Recomendación: validar la presencia de ambos secretos al inicio y abortar.
- **Reserva 2:** `src/middleware/auth.ts:47-49` captura los errores de la comprobación en BD
  y **continúa la petición** si falla. El token ya está verificado criptográficamente, así
  que no es un bypass de autenticación, pero sí neutraliza la revocación por borrado de
  usuario ante un fallo de BD. Se evalúa en Fase 3.

#### F1-06 — MEDIO — Runtime de Node no fijado
No hay `engines` en `package.json`, ni `.nvmrc`, ni `.node-version`, ni imagen base
versionada (Fase 0 §2-3). El runtime del VPS era el que hubiera instalado. Una versión de
Node fuera de soporte añade superficie propia. **No verificable desde el repositorio qué
versión corría** — pregunta abierta para el usuario.

#### F1-07 — ALTO — Dependencias vulnerables (conteo descompuesto)
`npm audit --omit=dev` sobre dependencias de producción: **18 vulnerabilidades = 4 críticas
+ 10 altas + 4 moderadas.**

> ⚠️ **MATIZADO (2026-07-26, Fase 4 §4) — cuatro filas de esta tabla sobreestiman la
> exposición real.** `jspdf`/`jspdf-autotable` (crítica) y `dompurify` (moderada) tienen **0
> usos en el código**: no son alcanzables y la corrección es *eliminarlas*, no actualizarlas.
> `xlsx` **no procesa ficheros subidos en el servidor** — solo en el navegador del operador que
> elige el fichero; la afirmación sobre las rutas `*/import` era incorrecta. La SQLi de
> `sequelize` en columnas JSON **no es alcanzable** (ninguna columna JSON se usa en un `where`).
> El conteo de `npm audit` es correcto, pero mide dependencias declaradas, **no
> alcanzabilidad**. Ver **Fase 4 §4** para la verificación. Las demás filas se mantienen.

| Paquete | Severidad | Nota |
|---|---|---|
| `next` 16.0.6 | **crítica** | ~35 advisories; ver §1 |
| `jspdf` (y `jspdf-autotable`) | **crítica** | LFI/path traversal, inyección PDF con ejecución de JS. Corrección **rompe compatibilidad** (`jspdf@4.2.1`) |
| `xlsx` (SheetJS) | alta | Prototype pollution + ReDoS. **Sin corrección disponible** — procesa ficheros subidos por usuarios (rutas `participants/import`, `gift-campaigns/.../import`) → prioritario en Fase 4 |
| `sequelize` 6.37.7 | alta | SQLi vía cast de tipo en columnas JSON (GHSA-6457-6jrx-69cr) → contrastar en Fase 4 |
| `jws` | alta | Verificación incorrecta de firma HMAC (GHSA-869p-cjfg-cm3x) — transitiva de `jsonwebtoken`. **Relevante para auth**; verificar alcance real |
| `lodash`, `minimatch`, `brace-expansion`, `ip-address`, `dottie` | alta/moderada | Prototype pollution / ReDoS / DoS |
| `express-rate-limit` | alta | Bypass de rate limiting por IPv6 mapeada. **Dependencia declarada pero no usada**: el limitador activo es `rate-limiter-flexible` |
| `dompurify` | moderada | Múltiples bypasses de XSS |
| `preact`, `sharp`, `uuid` | crítica/alta/moderada | Transitivas |

**Sin mantenimiento / problemáticas:** `xlsx` (sin parche disponible), `next-auth` (muerta,
§5), `express-rate-limit` (declarada sin uso), `@types/dompurify` y `@types/lru-cache`
(paquetes de tipos obsoletos, los originales ya incluyen tipos).

### 7. Nivel de confianza en que un CVE de Next.js fue el vector real

**Confianza: ALTA.** *(Revisado el 2026-07-26. La evaluación previa de confianza BAJA
~20-25 % se basaba en una objeción temporal sin resolver; esa objeción ha quedado resuelta
**en contra** de aquella conclusión y el veredicto se sustituye.)*

**Vector más probable: CVE-2025-55182 (React2Shell) — RCE sin autenticación vía protocolo
React Flight.**

**Razonamiento:**
1. **La objeción temporal queda resuelta.** El advisory se publicó el **2025-12-03**, siete
   meses **antes** del compromiso, no después. Era la única reserva que sostenía la
   evaluación de confianza baja, y el dato la invierte.
2. **La superficie requerida está presente y confirmada.** App Router con RSC ⇒ el protocolo
   Flight está activo. Verificado en la Fase 0 (`src/app/` con `layout.tsx`, sin `pages/`).
3. **No depende de ninguna de las condiciones que se descartaron correctamente en §1.** El
   análisis de §1 y §3 sigue siendo válido íntegro — la app no tiene Server Actions, no
   configura el Image Optimizer, su rewrite tiene destino estático, su CSP no usa nonces, y
   su middleware no autentica. **React2Shell simplemente no necesita nada de eso:** una sola
   petición POST manipulada contra la app basta.
4. **Distancia mínima al parche.** La versión desplegada, 16.0.6, estaba **una única versión
   de parche** por debajo del fix (16.0.7). No era una app con años de retraso: era una app
   que se perdió exactamente la actualización que importaba.
5. **Explotación masiva, automatizada e indiscriminada** documentada por múltiples fuentes
   independientes: escaneo y explotación activa a las horas de la divulgación, ~145 PoCs
   públicos con evasión de WAF, despliegue de backdoors Linux, criptomineros y túneles de
   proxy inverso, e inclusión en el catálogo KEV de CISA. **Un servidor autoalojado sin
   parchear no necesitaba ser un objetivo elegido** — bastaba con ser alcanzable. Esto encaja
   con un compromiso de un VPS pequeño sin nada que lo distinguiera como blanco.
6. La app quedó congelada el 2026-07-07 sin actualizar dependencias desde el 2026-07-03, y
   una app autoalojada con `next start` no recibe parches automáticos.

**Esto sigue siendo una hipótesis, no un hecho forense.** Alta confianza no es certeza. **No
existe ningún IoC que lo pruebe**: no hay logs de servidor ni de aplicación, y **no existe
snapshot ni backup del droplet** (confirmado por el usuario el 2026-07-26 — ver §8). La
cadena de evidencia es circunstancial pero convergente: versión vulnerable + superficie
confirmada + exploit público masivo + ventana temporal compatible. Lo que **no** hay es
prueba directa de que esta app en concreto fuera explotada por esta vía, y **ya no puede
obtenerse**.

**Hipótesis alternativas plausibles, no descartadas:**
Ninguna de estas queda invalidada por lo anterior. Son vulnerabilidades reales y demostradas
en el código, y siguen siendo vías de entrada viables que **no requieren ningún CVE**. Se
conservan íntegras en el plan de remediación con su severidad actual.
1. **F1-01** — `POST /api/participants` sin autenticación: escritura en la BD accesible desde
   Internet. Probada en el código.
2. **F1-03** — fuerza bruta contra `/api/auth/login`: rate limiting inoperante (~166 req/s) y
   evadible falsificando `x-forwarded-for`. Probada en el código.
3. Vectores fuera del alcance del repositorio (paquete de SO sin parchear, clave SSH robada de
   otra máquina, servicio abierto manualmente tras el despliegue, phishing) — indistinguibles
   sin el servidor, y ahora **permanentemente indistinguibles**.

### 8. Limitación permanente de la auditoría

**No existe snapshot ni backup del droplet** (confirmado por el usuario, 2026-07-26). El
servidor fue destruido sin imagen forense. En consecuencia, de forma **definitiva e
irreversible**, esta auditoría no puede: obtener IoC, confirmar el vector con evidencia
directa, determinar el modo de arranque real, saber si el puerto de Node estaba expuesto,
revisar logs de nginx o de aplicación, ni descartar los vectores de sistema operativo.

Esta vía de evidencia **no debe volver a proponerse como acción pendiente en ninguna fase**.
Todo lo que no sea determinable desde el repositorio queda como no determinable, punto.

---

## Fase 2 — Manejo de secretos

> Toda esta sección cumple R2: no contiene el valor de ningún secreto. Las
> verificaciones sobre `.env` y sobre los logs se hicieron con `grep -c` / `grep -o`
> sobre patrones, sin volcar contenido. Ningún archivo de secretos fue leído.

### 1. Alcance recalibrado (cerrado, no reinvestigado)

| Elemento | Resolución | Severidad |
|---|---|---|
| `.env` versionado | Valores de **desarrollo**; producción usaba otros. Confirmado por el usuario. | **Baja** — deuda de higiene |
| `acreditacion_dump.sql` versionado | **Solo datos de prueba.** Confirmado por el usuario. | **Baja** — deuda de higiene |

### 2. Los logs sin rastrear — F2-01

**Qué código los genera:** **ninguno.** Búsqueda de las cadenas `auth-debug`,
`sequelize-debug` y `debug.log` en `src/`, `scripts/`, `jest.*`, `next.config.js` y
`package.json` → **0 coincidencias**. Tampoco hay ninguna escritura a disco fuera del
módulo de uploads (`writeFile`/`appendFile`/`createWriteStream` en `src/` → solo
`XLSX.writeFile` en componentes de cliente, que es descarga de navegador).

**Conclusión:** ambos archivos son **redirecciones de shell de stdout/stderr**
(`... > auth-debug.log 2>&1`), no un subsistema de logging de la aplicación. La app **no
tiene logging a fichero**, ni en desarrollo ni en producción.

**Qué contienen (determinado solo con conteos de patrón, R2):**

| Indicador | `auth-debug.log` (294 líneas) | `sequelize-debug.log` (12 líneas) |
|---|---|---|
| Hashes bcrypt `$2[aby]$NN$` | **49** | 0 |
| Cadenas con forma de JWT (`x.y.z`) | **2** | 0 |
| `password` seguido de `:` o `=` | **49** | 0 |
| Sentencias SQL (`Executing`, `SELECT`, `INSERT`) | 0 | 0 |
| `DATABASE_URL` / `postgres://` / `JWT_SECRET` | 0 | 0 |

#### F2-01 — ~~ALTO~~ → **INFORMATIVO** (revisado 2026-07-26) — Material de autenticación en un fichero de log en claro
> **Reclasificado.** Los 49 hashes corresponden a **cuentas de prueba que no existirán en el
> sistema nuevo**, y el fichero **nunca estuvo rastreado por git** — no llegó al repositorio
> público. Sin impacto. **Única acción:** borrar `auth-debug.log` y `sequelize-debug.log` y
> añadir `*-debug.log` al `.gitignore`. El análisis original se conserva abajo por trazabilidad.
`auth-debug.log` (raíz del repo, 19.217 bytes, mtime 2026-01-04)
Contiene **49 hashes bcrypt y 2 tokens con forma de JWT**. Los hashes bcrypt son
descifrables sin conexión con un diccionario; si alguna cuenta usaba una contraseña débil,
está comprometida. **Esto es material real, no un falso positivo de nomenclatura:** el
patrón detectado es el prefijo de coste de bcrypt, no la palabra "password".
- **Sí es explotable** por cualquiera con acceso de lectura al fichero.
- **Alcance en el servidor: no verificable.** Como ningún código lo genera, lo más probable
  es que se creara en una máquina de desarrollo redirigiendo la salida. **No hay forma de
  saber si existía un fichero equivalente en el VPS** — y esa vía de evidencia está cerrada
  (§Fase 1.8). Se asume lo peor a efectos de rotación.
- `sequelize-debug.log` está **limpio**: 12 líneas, cero SQL, cero credenciales. Sin riesgo.
- **Corrección:** borrar ambos ficheros, añadir `*-debug.log` explícito al `.gitignore`
  (hoy `*.log` ya los cubre para git, pero no impide su creación), y **rotar las contraseñas
  de las 49 cuentas afectadas**, no solo los secretos de firma.

### 3. Historial de git — limpio

`git log --all --diff-filter=A --name-only` filtrado por
`\.env|secret|credential|\.pem|\.key|\.p12|\.pfx|\.jks|id_rsa|\.crt` sobre **todas** las
ramas (`main`, `feature/acreditacion-cambios`, `claude/busy-mirzakhani-04852e`):

**Únicos resultados: `.env` y `.example.env`.**
- **No hay claves privadas, certificados ni keystores en ningún punto del historial.**
- `.env` aparece en 2 commits: `37f6060` (2026-07-01, Alba Diaz — alta) y `fc26e95`
  (2026-07-03, emmanuelmarcano — modificación). Existen por tanto **dos versiones distintas**
  de `.env` en el historial; ambas con valores de desarrollo según confirmación del usuario.
- `.example.env` desde `b7bf785` (2025-12-09) — plantilla, correcto.
- `.env.test` **no está rastreado** (verificado con `git ls-files --error-unmatch`). Correcto.

### 4. Auditoría de `NEXT_PUBLIC_` — sin filtración

Solo **2 variables** con ese prefijo se consumen en el código, ambas en
`src/lib/emailjs.ts:3-4`:

| Variable | Clasificación |
|---|---|
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | **Pública por diseño.** Identificador de servicio de EmailJS, pensado para uso desde el navegador. |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | **Pública por diseño.** Es literalmente la *public key* de EmailJS; se usa en `emailjs.send(..., { publicKey })` desde el cliente (`emailjs.ts:20`). |
| `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL` | Definida en `.env` y `.example.env` pero **no la consume ningún módulo** (`grep` de `process.env.*` en `src/` y `scripts/` → ausente). Variable huérfana. Severidad **baja**. |

**Ningún secreto real lleva el prefijo `NEXT_PUBLIC_`.** `JWT_SECRET`, `JWT_REFRESH_SECRET`
y `DATABASE_URL` no lo llevan. Este vector queda descartado.

*Nota de exposición aceptada:* el flujo de correo de confirmación se ejecuta **desde el
navegador** (`@emailjs/browser`), de modo que cualquiera puede invocar la plantilla de correo
con el service ID y la public key extraídos del bundle. Es el modelo de EmailJS, no un fallo
de esta app, pero implica que el envío de correos es abusable por terceros (spam en nombre
del dominio). Severidad **baja**, se traslada al plan de remediación.

### 5. F2-02 — El módulo de firma JWT viaja al bundle del cliente

Este es el hallazgo abierto más relevante de la fase y **enlaza directamente con F1-05**.

**Cadena de dependencia probada:**
`src/components/auth/AuthProvider.tsx:6` y `src/store/authStore.ts:8` importan
`decodeAccessToken` desde `@/lib/jwt`. Como el import es del módulo entero, arrastra al
bundle de cliente **todo** `src/lib/jwt.ts`, incluidos `generateTokens`,
`verifyAccessToken`, `verifyRefreshToken` y las constantes de nivel superior
`JWT_SECRET` / `REFRESH_TOKEN_SECRET` (`jwt.ts:4, 6`).

**Confirmado en el build:** `.next/` contiene un `BUILD_ID` (`xA_prW8ijuWDyFMzjtDCD`) ⇒ es
salida de `next build`, no de `next dev`. En el chunk de cliente
`.next/static/chunks/f8f2a1ff2f5ee779.js` (505.019 bytes) aparecen:
- `decodeAccessToken` → **1 coincidencia** (confirma que `@/lib/jwt` está bundleado)
- la cadena `JWT_SECRET` → **1 coincidencia**
- la cadena `JWT_REFRESH_SECRET` → **1 coincidencia**
- `-----BEGIN` → **1 coincidencia**
- `process.env.JWT_SECRET` (expresión sin resolver) → **0 coincidencias**
- `postgres` / `postgres://` → **0 coincidencias**

#### CERRADO (2026-07-26) — falso positivo en su forma fuerte: **no hay ningún valor filtrado**

Dos verificaciones independientes, ambas con conteo únicamente (R2):

| Comprobación | Resultado |
|---|---|
| (a) Literal de desarrollo conocido, buscado en `.next/static/chunks/` con `grep -rc` | **0 coincidencias** |
| (b) Valor **real** extraído de `.env` a una variable de shell **sin imprimirlo jamás** (solo se reportó su longitud) y buscado con `grep -rlF` — `JWT_SECRET` (25 car.) y `JWT_REFRESH_SECRET` (33 car.) | **0 ficheros** en `.next/static/`, y **0 ficheros en todo `.next/`** |

La comprobación (b) es la concluyente porque **no depende de suponer cuál es el valor**: usa
el que realmente hay en `.env`. Ambos secretos dan cero en el bundle de cliente y en el de
servidor.

**Explicación estructural:** Next.js inlinea en el bundle de cliente **exclusivamente** las
variables con prefijo `NEXT_PUBLIC_`; cualquier otra `process.env.X` alcanzable desde el
cliente se resuelve a `undefined`. Eso explica con precisión lo observado: la cadena
`JWT_SECRET` sobrevive porque el minificador renombra `process` pero **no** el nombre de la
propiedad, que es exactamente la razón de que `process.env.JWT_SECRET` diera 0 coincidencias.
El `-----BEGIN` proviene con toda probabilidad de las constantes PEM de `jws`/`jwa`,
arrastradas por `jsonwebtoken`.

**F2-02 queda cerrado. No hay filtración de secretos al bundle. Sin acción requerida.**

**Lo que NO cierra: F2-03 sigue siendo el hallazgo real de este bloque.** Que
`src/lib/jwt.ts` completo cruce al bundle envía `generateTokens`, `verifyAccessToken` y
`verifyRefreshToken` al navegador aunque sus secretos lleguen vacíos: regala la
implementación del esquema de firma y deja el sistema **a un renombrado de variable de
distancia** de una fuga real — basta que alguien renombre `JWT_SECRET` a
`NEXT_PUBLIC_JWT_SECRET` intentando "arreglar" algo para convertirlo en crítico.
**Corrección obligatoria:** separar `src/lib/jwt.ts` en dos módulos — uno de servidor (firma
y verificación) con `import 'server-only'` en la primera línea, y uno de cliente que solo
decodifique.

#### F2-03 — MEDIO — Ausencia total de la barrera `server-only`
`grep -rn "server-only" src` → **0 coincidencias en todo el proyecto.**
Ningún módulo que toca credenciales o la base de datos (`src/lib/jwt.ts`,
`src/lib/sequelize.ts`, `src/models/*`, `src/services/*`) declara la barrera explícita que
haría fallar el build si se importaran desde un componente de cliente. F2-02 es exactamente
el fallo que esa barrera existe para impedir, y ocurrió. **Mala práctica con consecuencia
demostrada.**

### 6. Secretos embebidos en el código — ninguno

Búsqueda de credenciales literales (`secret|api_key|token|password` asignados a cadenas de
≥8 caracteres) y de valores por defecto tipo `changeme`/`admin123`/`'secret'` en `src/` y
`scripts/`:

- **0 secretos hardcodeados en código de producción.**
- Las únicas coincidencias son **ficheros de test** (`src/app/api/auth/*/__tests__/route.test.ts`,
  `src/services/__tests__/authService.test.ts`) con literales evidentes de prueba
  (`'fake-access-token'`, `'hashedpassword'`, `'password123'`). Correcto y esperado.
- `src/utils/constants.ts:32` es una **ruta de endpoint**, no un token, pese al nombre
  `REFRESH_TOKEN`.
- **Confirmado (F1-05):** `src/lib/jwt.ts:4, 6` usa `process.env.JWT_SECRET!` sin ningún
  valor de respaldo. Sigue siendo correcto.

### 7. Gestión de variables de entorno

**Inventario completo:** la app consume **11 variables**. `.example.env` documenta **10**.

| Variable | Usada en código | En `.example.env` | Nota |
|---|---|---|---|
| `DATABASE_URL` | sí | sí | |
| `JWT_SECRET` | sí | sí | |
| `JWT_REFRESH_SECRET` | sí | sí | |
| `JWT_EXPIRES_IN` | sí | sí | tiene respaldo `'7d'` |
| `JWT_REFRESH_EXPIRES_IN` | sí | sí | tiene respaldo `'30d'` |
| `NODE_ENV` | sí | sí | |
| `UPLOADS_DIR` | sí | sí | **ausente en `.env`** |
| `NEXT_PUBLIC_EMAILJS_SERVICE_ID` | sí | sí | |
| `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` | sí | sí | |
| `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL` | **no** | sí | huérfana |
| **`ALLOWED_ORIGIN`** | **sí** (`next.config.js:27`, `src/middleware/security.ts:3`) | **NO** | → **F2-04** |
| **`DB_SSL`** | **sí** (`src/lib/sequelize.ts:10`) | **NO** | → F2-06 |

#### F2-04 — MEDIO — `ALLOWED_ORIGIN` no documentada: su ausencia abre CORS en silencio
`src/middleware/security.ts:3` + `next.config.js:27`
Ambos puntos hacen `process.env.ALLOWED_ORIGIN || '*'`. La variable **no aparece en
`.example.env`**, de modo que un despliegue nuevo hecho a partir de la plantilla la omite y
la app arranca sirviendo `Access-Control-Allow-Origin: *` **junto a
`Access-Control-Allow-Credentials: true`** (`security.ts:6-9`). Peor aún, `setCorsHeaders`
refleja el `Origin` de la petición cuando la lista contiene `'*'` (`security.ts:7-8`), que es
el patrón que hace la combinación realmente explotable desde cualquier origen.
**Mala práctica con explotabilidad clara; no verificable si estaba definida en el VPS.**
**Corrección:** documentarla en `.example.env`, eliminar el respaldo `'*'` y abortar el
arranque si falta.

#### F2-05 — MEDIO — Filtración de detalles internos en respuestas de error
**26 de 52 rutas** referencian `error.message`; en **22** se devuelve directamente al cliente
en el cuerpo JSON. Ejemplos ya identificados:
`src/app/api/accreditations/stats/route.ts:32` (además **sin auth**, F1-02),
`src/app/api/uploads/route.ts`, `src/app/api/reports/dashboard/route.ts`.
Un error de Sequelize propagado así puede revelar nombres de tabla y columna, restricciones y
fragmentos de consulta. **No filtra el valor de ningún secreto** — `DATABASE_URL` no se
interpola en los mensajes —, pero facilita el reconocimiento previo a una inyección.
**Desglose: 52 rutas = 22 devuelven `error.message` al cliente + 4 lo usan solo en logs de
servidor + 26 no lo tocan.**
**Corrección:** respuesta genérica al cliente + detalle al log del servidor.

#### F2-06 — ~~MEDIO~~ → **BAJO / higiene** (revisado 2026-07-26) — TLS de base de datos sin validar el certificado
> **Reclasificado.** La reconstrucción usará **PostgreSQL self-hosted en el mismo droplet**,
> con conexión por localhost o socket unix. Sin intermediario de red posible,
> `rejectUnauthorized: false` deja de ser explotable en la arquitectura de destino.
> **No es bloqueante del redespliegue**; se mantiene como corrección de higiene por si la BD
> se externaliza en el futuro.
`src/lib/sequelize.ts:27`
`dialectOptions: { ssl: { require: true, rejectUnauthorized: false } }`. Se exige TLS pero
**no se valida la cadena del certificado**, lo que anula la protección frente a un
intermediario activo en la ruta a la base de datos. Aplica en producción
(`sequelize.ts:10`: `useSSL` se activa con `NODE_ENV=production`). Es un patrón común con
bases gestionadas de DigitalOcean, pero la solución correcta es cargar el certificado de CA
del proveedor y poner `rejectUnauthorized: true`.
**Mala práctica; sin evidencia de explotación** (requeriría posición de red).

#### F2-07 — BAJO — Sin validación de variables críticas al arranque
Ni `DATABASE_URL` (`src/lib/sequelize.ts:13` usa `|| ''`) ni `JWT_SECRET` /
`JWT_REFRESH_SECRET` (`jwt.ts:4, 6`) se validan al iniciar. Como se estableció en F1-05, el
fallo es **en cerrado** (401 / error de conexión), no un bypass — pero se manifiesta en la
primera petición, no al desplegar. Confirma y extiende la reserva de F1-05.
**Corrección:** un módulo de validación de entorno que aborte el arranque si falta cualquiera
de las cinco variables críticas.

### 8. No hay lista de rotación

**Decisión del usuario, confirmada (2026-07-26): en la reconstrucción no se restaura nada del
entorno anterior.** Los datos de producción serán nuevos — no vienen del dump, no vienen de
las cuentas del log de auth, no vienen de la base anterior.

**Por tanto no hay credenciales heredadas y no procede una lista de rotación.** La lista de
8 entradas que ocupaba esta sección queda anulada:

- Los secretos de producción (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`) **no se
  rotan como remediación de un compromiso**: el despliegue nuevo los genera nuevos por
  construcción. Se reencuadran como **"generación de secretos del despliegue nuevo"** dentro
  del runbook de reconstrucción (Fase 7), no como acción de contención.
- Las 49 cuentas con hash en `auth-debug.log` y los 2 JWT del mismo fichero **no existirán en
  el sistema nuevo**. Nada que forzar, nada que invalidar. Ver F2-01, reclasificado a
  informativo.
- Los secretos de desarrollo del `.env` versionado nunca estuvieron en producción y morirán
  con el entorno de desarrollo actual.
- Las claves de EmailJS son públicas por diseño; lo único pendiente es revisar límites de uso
  por el abuso descrito en §4, que no es rotación.

Se retira también la premisa de que "todo secreto presente en el VPS se presume
comprometido": sigue siendo cierta, pero es **irrelevante**, porque ninguno de esos secretos
sobrevive al cambio.

> **Consecuencia para el resto de la auditoría: lo único que se arrastra del sistema anterior
> es el código.** El valor de las fases restantes está íntegramente en los hallazgos
> corregibles antes del despliegue, no en la contención de credenciales. El reporte final
> (Fase 7) se enfoca en consecuencia.

---

## Fase 3 — Superficie expuesta y autenticación

### 1. Veredicto

> El **mecanismo** de autenticación es correcto: firma verificada, algoritmo no negociable,
> bcrypt con coste 12, rotación de refresh tokens, roles bien definidos y por defecto
> restrictivos. **El fallo no está en el mecanismo, sino en su aplicación:** 5 handlers que
> tocan la base de datos quedaron sin envolver, y entre ellos forman una **cadena completa de
> exfiltración masiva de datos personales sin autenticación** (F3-01).
>
> **F3-01 es un hallazgo crítico probado en el código, y compite con React2Shell como
> explicación de una fuga de datos.** No compite como explicación del compromiso *del
> servidor* — no da ejecución de código —, pero si lo que se busca explicar es cómo salieron
> datos, esta vía no requiere ningún CVE y está abierta a cualquiera con la URL pública del
> evento.

### 2. Corrección del inventario de la Fase 1 — medición por método HTTP

La clasificación de la Fase 1 §1.4 se hizo por **fichero**. Es incorrecta: en App Router cada
`route.ts` exporta un handler **por verbo**, y en esta app varios ficheros mezclan handlers
protegidos y desprotegidos. Medición correcta, sobre los 52 ficheros (excluidos `__tests__`):

**81 handlers HTTP exportados = 68 con `withAuth` + 13 sin `withAuth`.**

Desglose de los 13 sin `withAuth`:

| Handler | Clasificación |
|---|---|
| `POST /api/auth/login` | pública por diseño |
| `POST /api/auth/logout` | pública por diseño (ver F3-06) |
| `POST /api/auth/refresh` | pública por diseño |
| `GET /api/public/events/[slug]` | pública por diseño |
| `GET /api/public/events/[slug]/lookup` | pública por diseño — **pero ver F3-02** |
| `POST /api/public/events/[slug]/register` | pública por diseño |
| `GET /api/uploads/[filename]` | pública por diseño (F1-04: guarda de traversal correcta) |
| `GET /api/health` | pública — **ver F3-07** |
| `POST /api/participants` | **sin auth, escribe en BD** — F1-01 (ya reportado) |
| `GET /api/accreditations/stats` | **sin auth, lee BD** — F1-02 (ya reportado) |
| **`GET /api/events/[eventId]/participants`** | **sin auth, lee BD** — **NUEVO, F3-01** |
| **`GET /api/participants/[participantId]`** | **sin auth, lee BD** — **NUEVO, F3-01** |
| **`GET /api/participants/[participantId]/guests`** | **sin auth, lee BD** — **NUEVO, F3-01** |

**Desglose final: 81 handlers = 68 protegidos + 7 públicos por diseño + 1 público a revisar
(`health`) + 5 sin auth que tocan la base de datos.**

### 3. Hallazgos

#### F3-01 — CRÍTICO — Cadena completa de exfiltración de PII sin autenticación
`src/app/api/events/[eventId]/participants/route.ts:11`
`src/app/api/participants/[participantId]/route.ts:10`
`src/app/api/participants/[participantId]/guests/route.ts:10`

Los tres `GET` son `export async function GET(...)` planos. En los tres ficheros, los demás
verbos **sí** están envueltos (`PUT`/`DELETE` con `[ADMIN, OPERATOR]`), lo que indica que la
omisión es un descuido, no una decisión.

**Cadena de explotación, verificada extremo a extremo en el código:**
1. `GET /api/public/events/{slug}` — público por diseño. `route.ts:25` devuelve
   `attributes: ['id', ...]` ⇒ **entrega el UUID del evento**. El *slug* es público por
   definición: es la URL de la landing de inscripción.
2. `GET /api/events/{id}/participants?limit=99999` — **sin auth**. Devuelve el **padrón
   completo** del evento, paginado y con parámetros `search`, `name`, `email`
   (`route.ts:19-33`).
3. `GET /api/participants/{pid}` — **sin auth**. `route.ts:17` llama a
   `getParticipant(participantId, true, true)`, es decir con las relaciones incluidas: ficha
   completa.
4. `GET /api/participants/{pid}/guests` — **sin auth**. Lista de acompañantes con sus datos.

**Impacto:** volcado completo de la base de participantes y acompañantes —nombre, apellidos,
correo, teléfono, número de documento (RUT), preferencias alimentarias— de cualquier evento,
partiendo únicamente de una URL pública. Sin credenciales, sin CVE, sin condiciones previas.
**Esto es explotable y la prueba está en el código.**

**Corrección (bloqueante del redespliegue):** envolver los tres `GET` con `withAuth`.

> **Rectificado al ejecutar A1 (2026-07-27) — ver §7.0, séptima corrección.** La lista de roles
> que esta ficha proponía (`[ADMIN, OPERATOR]`, *«igual que sus `PUT`/`DELETE` hermanos»*) es
> **incorrecta**, y la de la fila A1 de §7.3 (`[ADMIN, OPERATOR, GUARD]`) **también**. Las dos
> omiten `MANAGER`, que `Sidebar.tsx:23` encamina a `/participants`. Listas aplicadas, cada una
> la **unión de los `RoleGuard` de las pantallas que consumen el endpoint**:
>
> | Endpoint | Roles | Por qué |
> |---|---|---|
> | `GET /api/events/[eventId]/participants` | `[ADMIN, MANAGER, OPERATOR, GUARD]` | `SearchParticipant.tsx:19,28` → `participantStore.ts:86` lo llama desde el panel de acreditación, cuyo guard es `[ADMIN, MANAGER, OPERATOR, GUARD]` (`accreditation/page.tsx:12`) |
> | `GET /api/participants/[participantId]` | `[ADMIN, MANAGER, OPERATOR]` | Solo lo consume `/participants` (`participantStore.ts:70`, `guestStore.ts:29`), guard `[ADMIN, MANAGER, OPERATOR]` |
> | `GET /api/participants/[id]/guests` | `[ADMIN, MANAGER, OPERATOR]` | Sin consumidor en el cliente; devuelve un subconjunto de la ficha anterior |
>
> El error de la ficha tiene una causa concreta: **alinear los `GET` con sus `PUT`/`DELETE`
> hermanos es el criterio equivocado.** Escribir y leer no tienen los mismos consumidores — un
> `GUARDIA` busca en el padrón para acreditar y no modifica nada.

#### F3-02 — ALTO — `lookup` público es un oráculo de enumeración por RUT
`src/app/api/public/events/[slug]/lookup/route.ts:26-31`
Endpoint público que recibe un RUT por query string y, si existe, devuelve la ficha del
participante: nombre, apellidos, **correo, teléfono, número de documento**, preferencias
alimentarias y la lista de acompañantes con sus documentos (`route.ts:47-70`). Responde
`{found: false}` si no existe: un **oráculo binario perfecto**.

El espacio de RUT chileno es **enumerable por fuerza bruta** (secuencial con dígito
verificador), y `rutVariants()` (`route.ts:27`) acepta además múltiples formatos, lo que
facilita el barrido. Con el rate limiting inoperante de F1-03, recorrer el rango completo es
trivial. A diferencia de F3-01 este endpoint **es público a propósito**, pero devuelve mucho
más de lo que su función requiere.
**Explotable; la funcionalidad es intencionada, el alcance de los datos no.**
**Corrección:** devolver el mínimo imprescindible para el flujo de inscripción (existencia +
nombre de pila), nunca correo/teléfono/documento completos; rate limiting real por IP **y**
por slug; considerar un segundo factor de conocimiento.

#### F3-03 — ALTO — `bcrypt.compareSync` bloquea el bucle de eventos en el login
`src/services/authService.ts:15`
El login usa la variante **síncrona** `bcrypt.compareSync`, pese a que el modelo expone un
`comparePassword` asíncrono correcto (`src/models/User.ts:65`). Con coste 12
(`User.ts:147`), cada verificación bloquea el hilo único de Node **decenas o cientos de
milisegundos**, durante los cuales el proceso no atiende **ninguna** otra petición.
Combinado con F1-03 (rate limiting inoperante y falsificable), un puñado de peticiones de
login concurrentes basta para dejar la aplicación entera sin responder. **Denegación de
servicio de coste casi nulo para el atacante.**
**Corrección:** usar `await bcrypt.compare(...)` / `user.comparePassword(...)`.

#### F3-04 — MEDIO — Enumeración de usuarios por canal temporal
`src/services/authService.ts:14-18`
El mensaje es correctamente genérico (`'Invalid credentials'` para usuario inexistente y para
contraseña incorrecta) y el estado también (401): **por contenido no hay enumeración**. Pero
`bcrypt.compareSync` **solo se ejecuta si el usuario existe** (cortocircuito del `||` en
`authService.ts:15`). La diferencia de tiempo de respuesta entre "no existe" (inmediato) y
"existe, contraseña incorrecta" (coste 12) es de órdenes de magnitud y perfectamente medible.
**Mala práctica con explotabilidad clara; no encontré evidencia de explotación.**
**Corrección:** ejecutar siempre una comparación bcrypt contra un hash señuelo cuando el
usuario no exista.

#### F3-05 — MEDIO — Sin bloqueo de cuenta ni backoff tras intentos fallidos
`src/services/authService.ts:11-18`, `src/app/api/auth/login/route.ts:8-11`
No existe contador de fallos, bloqueo temporal, backoff progresivo ni CAPTCHA. La **única**
defensa es `rateLimitMiddleware`, que F1-03 demostró inoperante (~166 req/s por IP) y
evadible falsificando `x-forwarded-for`. El login registra los intentos en el log de
auditoría **solo cuando la cuenta está desactivada** (`authService.ts:21-27`): **un fallo de
contraseña no deja rastro alguno**, así que un ataque de fuerza bruta sería invisible en la
propia auditoría de la aplicación.
**Corrección:** bloqueo progresivo por cuenta y por IP, y registrar **todos** los intentos
fallidos.

#### F3-06 — MEDIO — `logout` sin autenticar permite revocar tokens ajenos
`src/app/api/auth/logout/route.ts:6-14` + `src/services/authService.ts:128-139`
El endpoint no está autenticado y revoca el refresh token que reciba en el cuerpo, **sin
comprobar que pertenezca a quien llama**. Quien obtenga un refresh token ajeno (por F3-08,
XSS) puede invalidar la sesión de esa persona. Impacto limitado a denegación de servicio
dirigida — no permite suplantar—, pero el endpoint debería exigir el access token.

#### F3-07 — MEDIO — `/api/health` filtra detalles internos sin autenticación
`src/app/api/health/route.ts:10`
Ante un fallo devuelve `(error as Error).message` del error de conexión de PostgreSQL, que
típicamente incluye **host, puerto, nombre de base de datos y usuario**. Es reconocimiento
gratuito para un atacante no autenticado, y basta con provocar o esperar un fallo de BD.
Es el mismo patrón que F2-05, aquí sobre un endpoint público.
**Corrección:** devolver `{status:'error'}` sin detalle; el detalle al log del servidor.

#### F3-08 — MEDIO — Tokens en `localStorage`, sin cookies `httpOnly`
`src/store/authStore.ts:112` (`createJSONStorage(() => localStorage)` en `persist`)
El access token y el refresh token se guardan en `localStorage`. **No hay ninguna cookie
`httpOnly` en todo el proyecto** (`grep` de `httpOnly|Set-Cookie|cookies()` en `src/` → 0
coincidencias). Cualquier XSS obtiene ambos tokens y, con el refresh de 30 días, persistencia
prolongada. Agravante: la CSP incluye `'unsafe-inline'` y `'unsafe-eval'`
(`src/middleware/security.ts:18`), lo que debilita la defensa contra el XSS que haría falta.
**Mala práctica; no encontré XSS explotable en esta fase** (queda para la Fase 4).

#### F3-09 — BAJO — La comprobación de revocación en BD falla abierta
`src/middleware/auth.ts:42-49` — *(cierre de la Reserva 2 de F1-05)*
El `catch` vacío deja pasar la petición si la consulta a `User` falla. **No es un bypass de
autenticación**: el token ya se verificó criptográficamente en `auth.ts:27`. Lo que se pierde
mientras la BD no responde es la **revocación por borrado de usuario** — y solo eso.
Verificado que **no** se pierde nada más, porque esos controles no existían ya:
- **Cambio de rol:** el rol se toma del **token** (`auth.ts:33`), nunca de la BD ⇒ un cambio
  de rol no surte efecto hasta que expire el access token. Ver F3-10.
- **Cuenta desactivada:** `isActive` se comprueba en el login (`authService.ts:20`) y en el
  refresh (`authService.ts:103`), **no** en `withAuth`. Desactivar a alguien no corta su
  sesión en curso; solo impide renovarla.
- La consulta pide `attributes: ['id']` (`auth.ts:43`), así que ni siquiera trae `isActive`.

**Corrección:** traer `['id','isActive','role']`, comprobar ambos, y fallar **cerrado**
(503) si la BD no responde.

#### F3-10 — BAJO — Autorización basada en el token, no en la base de datos
`src/middleware/auth.ts:33-37`
`allowedRoles.includes(user.role)` compara contra el rol **incrustado en el JWT**. Con
`JWT_EXPIRES_IN` por defecto de **7 días** (`src/lib/jwt.ts:5`), degradar el rol de alguien
no tiene efecto durante hasta una semana. **Mala práctica de diseño; no es explotable por sí
sola** (requiere un token legítimamente emitido). **Corrección:** access tokens cortos
(15 min) apoyados en el refresh, y/o leer el rol de la BD en `withAuth`.

### 4. `withAuth` — auditoría del mecanismo (§3.1)

**Correcto en lo esencial.** Ningún hallazgo explotable en el mecanismo mismo.

| Aspecto | Resultado |
|---|---|
| Verificación de firma | **Sí.** `jwt.verify(token, JWT_SECRET)` (`src/lib/jwt.ts:32`), invocado desde `auth.ts:27`. |
| Expiración | **Sí**, implícita: `jwt.verify` rechaza tokens expirados y el `catch` devuelve `null` ⇒ 401. |
| Algoritmo `none` / algoritmo elegido por el token | **No es explotable.** `jsonwebtoken@9` rechaza `none` por defecto y, al pasarse un secreto de tipo cadena, restringe la verificación a HMAC. **Observación:** no se pasa `{ algorithms: ['HS256'] }` explícitamente (`jwt.ts:32, 48`); la defensa depende del comportamiento por defecto de la librería en vez de ser declarada. Fijarlo es endurecimiento barato. |
| Advisory `jws` GHSA-869p-cjfg-cm3x (verificación HMAC incorrecta) | **La app no cae en el patrón vulnerable**, al no aceptar algoritmos suministrados por el cliente. Se corrige igualmente con `npm audit fix` (F1-07). |
| Origen del token | **Solo la cabecera `Authorization: Bearer`** (`auth.ts:20-26`). **No hay lectura de cookies en ninguna parte del proyecto** ⇒ **no existe ambigüedad de precedencia** explotable. |
| Efecto colateral positivo | Al no usar cookies, la app **no es vulnerable a CSRF** por sesión: un `<form>` de un sitio ajeno no puede añadir la cabecera `Authorization`. Esto **acota mucho** el impacto de F3-11. |

### 5. Autorización por rol (§3.2) — conteo descompuesto

**68 handlers con `withAuth` = 62 con lista de roles explícita + 6 sin segundo argumento.**
Los 6 sin argumento heredan el valor por defecto `[ROLES.ADMIN]` (`auth.ts:57`), es decir
**el más restrictivo**: el defecto es *fail-safe*. Correcto.

Distribución de las 62 listas explícitas (roles: `ADMIN`, `MANAGER`, `OPERATOR`,
`GUARD='GUARDIA'`):

| Roles permitidos | Handlers |
|---|---|
| `[ADMIN, OPERATOR, GUARD]` | 22 |
| `[ADMIN, OPERATOR]` | 15 |
| `[ADMIN, OPERATOR, MANAGER, GUARD]` | 12 |
| `[ADMIN]` | 10 |
| `[ADMIN, OPERATOR, MANAGER]` | 1 |
| `[ADMIN, MANAGER, OPERATOR]` | 1 |

**Rutas administrativas — todas correctamente restringidas.** Ninguna ruta que modifique
usuarios o permisos es alcanzable por un rol básico:

| Ruta | Roles | Veredicto |
|---|---|---|
| `GET/POST /api/users` | `[ADMIN]` | correcto |
| `PUT/DELETE /api/users/[id]` | `[ADMIN]` | correcto |
| `GET /api/audit-logs` | `[ADMIN]` | correcto |
| `POST /api/auth/register` | `[ADMIN]` + comprobación redundante en `authService.ts:64` | **correcto, con defensa en profundidad** |
| `POST/PUT/DELETE /api/email-templates` | `[ADMIN]` | correcto |
| `GET /api/events/[eventId]/export` | `[ADMIN, OPERATOR, MANAGER]` | aceptable (exportación operativa) |
| `POST /api/uploads` | `[ADMIN, OPERATOR]` | aceptable |

**Nada que marcar en rojo en este apartado.** El modelo de roles es coherente y el sesgo es
hacia lo restrictivo.

### 6. IDOR (§3.3) — conteo descompuesto y matización

**30 handlers reciben un identificador por parámetro dinámico. 14 referencian `req.user`.**
Revisado el uso: en los 14 casos `req.user.id` se pasa a la capa de servicio como **autoría
para el registro de auditoría** (`createdBy`, `accreditedBy`, `assignedBy`, `deletedBy`),
**nunca como filtro de propiedad**. Ejemplos: `participants/[participantId]/route.ts:29, 42`,
`guests/[guestId]/route.ts:11, 22`, `accreditations/route.ts:15`.

**Conclusión: no existe aislamiento por propiedad ni por ámbito en ninguna ruta.** Cualquier
usuario autenticado con el rol adecuado puede leer y modificar el recurso de cualquier evento.

**Esto no lo clasifico como IDOR explotable**, y la distinción importa: el modelo de la
aplicación es **RBAC de personal interno**, no multi-tenant — un OPERATOR es personal de
acreditación que legítimamente atiende cualquier evento. No hay noción de "mis eventos" en el
modelo de datos. **Es una decisión de diseño, no un fallo**, con dos salvedades:
- **No verificable desde el código** si la intención era acotar el personal por evento. Si lo
  era, faltan las comprobaciones por completo. **Pregunta abierta para el usuario.**
- El IDOR real y confirmado **no está aquí sino en F3-01**, donde ni siquiera hace falta
  estar autenticado.

### 7. Ciclo de vida de los tokens (§3.4)

| Aspecto | Resultado |
|---|---|
| **Rotación del refresh token** | **Implementada correctamente.** `authService.ts:108` revoca el token usado antes de emitir el nuevo (`:119-123`). No es un token reutilizable 30 días. |
| **Rechazo de token ya consumido** | **Sí.** `authService.ts:88` rechaza si `isRevoked`. |
| **Detección de reutilización como incidente** | **No.** Reutilizar un token revocado devuelve un 401 y nada más: no se revoca la familia de tokens del usuario ni se registra en auditoría. Es la señal canónica de robo de token y se descarta en silencio. **Severidad baja** (la rotación ya limita el daño). **Corrección:** ante reutilización, revocar todos los refresh tokens del usuario y registrarlo. |
| **Comprobación de expiración en BD** | **Sí**, `authService.ts:92-95`, además de la del JWT. |
| **`isActive` en el refresh** | **Sí**, `authService.ts:103`. Una cuenta desactivada no puede renovar. |
| **Revocación en logout** | **Sí, real en BD** (`authService.ts:131`), no solo estado de cliente. Pero el endpoint no está autenticado → F3-06. |
| **Almacenamiento en el navegador** | `localStorage` → F3-08. |
| **Duración** | Access 7 días, refresh 30 días (`jwt.ts:5, 7`). El access token de 7 días es **excesivo** y amplifica F3-10 y F3-08. **Corrección:** 15 minutos. |

### 8. Rutas públicas por diseño (§3.6)

| Ruta | Veredicto |
|---|---|
| `GET /api/health` | **F3-07** — filtra detalles de conexión a BD. |
| `GET /api/public/events/[slug]` | Devuelve una lista blanca explícita de atributos (`route.ts:25`) — patrón correcto. **Pero incluye `id`**, que es el eslabón 1 de F3-01. Una vez corregido F3-01 deja de ser problema. |
| `GET /api/public/events/[slug]/lookup` | **F3-02** — oráculo de enumeración por RUT con exceso de PII. |
| `POST /api/public/events/[slug]/register` | Validación y límites pendientes de la Fase 4 (validación de entrada y capacidad). Comprobado aquí que solo opera sobre eventos con `isActive` e `isPublic`. |
| `GET /api/uploads/[filename]` | F1-04 confirmó la guarda de traversal. **Sirve de forma indiscriminada**: cualquiera con el nombre puede leer cualquier fichero subido. Mitigante: los nombres son UUID (`safeFilename` documenta `<uuid>.<ext>`), no adivinables por fuerza bruta. **Riesgo bajo**, es *security through obscurity* pero aceptable para imágenes de eventos públicos. Se agrava solo si alguna respuesta filtra rutas en masa. |

### 9. Cierre de F2-04 — CORS en ejecución (§3.7)

**Confirmado leyendo el código. La combinación peligrosa existe.**
`src/middleware/security.ts:3` — sin `ALLOWED_ORIGIN`, `allowedOrigins = ['*']`.
`security.ts:7-8` — si la lista contiene `'*'`, se ejecuta
`response.headers.set('Access-Control-Allow-Origin', origin)`: **refleja el `Origin` de la
petición**, no devuelve el literal `*`.
`security.ts:6` — establece **siempre** `Access-Control-Allow-Credentials: true`.

Reflejar el origen junto a `Allow-Credentials: true` es exactamente el patrón que los
navegadores **sí** aceptan (a diferencia del literal `*`, que rechazarían), y permitiría a
cualquier sitio web leer respuestas autenticadas.

**Atenuante decisivo, y por eso no lo elevo a crítico:** esta app **no usa cookies** — los
tokens van en `localStorage` y se envían en la cabecera `Authorization` (§4). Un sitio de
terceros no dispone del token de la víctima, así que sus peticiones cruzadas salen sin
autenticar. **La configuración es incorrecta y peligrosa, pero no explotable en la
arquitectura actual.** Se vuelve explotable en el momento en que alguien migre a cookies —
migración que, irónicamente, es la corrección recomendada para F3-08.
**Severidad: MEDIA. Corrección:** eliminar el respaldo `'*'`, exigir `ALLOWED_ORIGIN`
explícita y abortar el arranque si falta; documentarla en `.example.env` (F2-04).

### 10. Endpoint de tiempo real (§3.8) — superficie WebSocket descartada

`src/app/api/reports/realtime/[eventId]/route.ts:15` es un `GET` HTTP convencional envuelto
en `withAuth(..., [ADMIN, OPERATOR, GUARD])` que devuelve un JSON con
`reportService.getRealTimeStats(eventId)`. **No hay `ReadableStream`, ni SSE, ni
`text/event-stream`, ni upgrade de protocolo.** El "tiempo real" es **polling** desde el
cliente.

**Conclusión: la aplicación no abre ningún WebSocket.** Combinado con la Fase 1 §2, la
superficie de GHSA-c4j6-fc7j-m34r (SSRF por WebSocket upgrade) **se limita al handler de
upgrade del propio servidor de Next**, si corría bajo `next start`. La app no contribuye
superficie propia. Es lo máximo que puede determinarse desde el código.

### 11. Resumen de severidades de la Fase 3

| ID | Severidad | Estado de la evidencia |
|---|---|---|
| F3-01 | **CRÍTICO** | Explotable — prueba en el código |
| F3-02 | ALTO | Explotable — prueba en el código |
| F3-03 | ALTO | Explotable — prueba en el código |
| F3-04 | MEDIO | Mala práctica con explotabilidad clara; sin evidencia de explotación |
| F3-05 | MEDIO | Mala práctica con explotabilidad clara; sin evidencia de explotación |
| F3-06 | MEDIO | Explotable con condición previa (token ajeno) |
| F3-07 | MEDIO | Explotable — prueba en el código |
| F3-08 | MEDIO | Mala práctica; sin XSS encontrado todavía (Fase 4) |
| F2-04 | MEDIO | Configuración peligrosa **no** explotable en la arquitectura actual |
| F3-09 | BAJO | Mala práctica; no es bypass |
| F3-10 | BAJO | Mala práctica de diseño; no explotable por sí sola |

### 12. Preguntas abiertas de esta fase

1. **¿El personal debía estar acotado por evento?** (§6). Si la intención era que un OPERATOR
   solo atendiera sus eventos asignados, faltan todas las comprobaciones de ámbito y el
   modelo de datos no las soporta. Si el diseño es "todo el personal ve todo", no hay nada que
   corregir. **No determinable desde el código.**
2. **¿`GET /api/events/[eventId]/participants` alimenta alguna vista pública?** Si alguna
   pantalla sin sesión depende de él, envolverlo en `withAuth` la romperá. Por lo revisado
   parece consumo exclusivo del panel autenticado, pero conviene confirmarlo antes de aplicar
   la corrección de F3-01.

---

## Fase 4 — Inyección y validación de entrada

### 1. Veredicto

> **No hay inyección SQL explotable, y no hay ningún camino a ejecución de comandos en el
> código de la aplicación.** Los dos sumideros clásicos que el plan priorizaba están cerrados:
> el SQL crudo está parametrizado y `child_process`/`eval` no existen en el proyecto.
>
> **El fallo de esta fase es de validación, no de inyección.** El hallazgo nuevo relevante es
> **F4-01**: el endpoint de registro público **omite por completo la validación de esquema en
> su modo `rut`**, lo que convierte la fuga de lectura de F3-01/F3-02 en **escritura sin
> autenticar** sobre la ficha de cualquier participante conocido. Y **F4-02**: los invitados se
> procesan desde el body crudo, sin tope ni validación, desde un endpoint público.
>
> **Además, esta fase corrige tres afirmaciones de F1-07 que sobredimensionaban el riesgo de
> dependencias** (§4): `jspdf` y `dompurify` no se usan en absoluto, y `xlsx` **no procesa
> ficheros subidos en el servidor** — solo en el navegador de quien elige el fichero.

### 2. Hallazgos

#### F4-01 — ALTO — El registro público en modo `rut` escribe sin autenticación **y sin validación de esquema**
`src/app/api/public/events/[slug]/register/route.ts:60-96`

`publicRegistrationSchema.safeParse(body)` se ejecuta **únicamente en la rama `else`**
(`route.ts:99`), es decir solo en el modo `open`. Cuando el evento está en modo `rut`
(`route.ts:36`, `registrationConfig.mode === 'rut'`), el flujo entra en la rama de
`route.ts:60` y **no hay ninguna validación**: se localiza el participante por
`body.participantId` (`route.ts:69-72`) y se escriben 12 campos tomados directamente del
cuerpo mediante `setIf` (`route.ts:80-93`), sin comprobar tipo, formato ni longitud.

**Por qué es alcanzable sin credenciales:** el `participantId` es público.
`src/app/api/public/events/[slug]/lookup/route.ts:46` lo devuelve explícitamente
(`id: p.id`) a cualquiera que acierte un RUT, y F3-02 ya estableció que el espacio de RUT
chileno es enumerable por fuerza bruta con el rate limiting inoperante de F1-03. Los eslabones
2 y 3 de la cadena de F3-01 también lo entregan.

**Impacto:** cualquiera en Internet puede **sobrescribir** `firstName`, `lastName`, `email`,
`phone`, `company`, `position`, `numeroSap`, `dietaryPreference`, `dietaryComments`,
`guestCount`, `guestCompanion` y `guestLoads` de cualquier participante precargado de cualquier
evento público en modo `rut`. Corrupción de datos sin autenticar; y al ser `email` uno de los
campos sobrescribibles, permite además redirigir el correo de confirmación de esa persona.
**Esto es explotable y la prueba está en el código.**

**Acotación honesta:** el conjunto de campos es una lista explícita (`setIf`), **no es
asignación masiva**: no se pueden tocar `id`, `eventId`, `createdBy`, `allowMultipleSchedules`
ni `allowedGuests`. Y requiere que el evento esté `isActive` + `isPublic` +
`registrationOpen !== false` y en modo `rut`. Por eso es ALTO y no CRÍTICO.

**Corrección:** validar el body de la rama `rut` con un esquema propio antes de cualquier
escritura, y no aceptar `participantId` como única prueba de identidad (ligarlo al RUT
verificado en el mismo paso).

#### F4-02 — ALTO — Los invitados del registro público se leen del body crudo, sin validación y sin tope
`src/app/api/public/events/[slug]/register/route.ts:54` y `:214-240`

`route.ts:54` toma `guestsInput` de `body.guests` — el **body crudo** —, no de
`validation.data`. `publicRegistrationSchema` **sí** define un esquema para `guests`
(`src/utils/validators/participantSchemas.ts:84-90`), pero su resultado validado nunca se usa
para los invitados: se descarta. En consecuencia el esquema de invitados es **decorativo en
ambos modos**.

El bucle de `route.ts:214-240` no tiene ningún freno: cada elemento con `firstName` crea una
fila `Guest`. **No se comprueba `event.maxGuestsPerParticipant`, ni `guestsConfig.max`
(`eventSchemas.ts:36`), ni `participant.allowedGuests`, ni la longitud del array.**

**Impacto doble:**
1. **Inflado ilimitado de la base de datos sin autenticar.** Una sola petición con un array de
   100.000 elementos crea 100.000 filas. Con el rate limiting de F1-03 (~166 req/s, evadible
   falsificando `x-forwarded-for`) es agotamiento de almacenamiento a coste nulo.
2. **Elusión del límite de negocio de invitados por participante**, que sí existe declarado en
   la configuración del evento y en `createParticipant` (`participantService.ts:40-42`) pero no
   en esta ruta.

**Corrección:** usar `validation.data.guests`, aplicar `.max()` al array en el esquema y
comprobar el cupo efectivo del evento y del participante antes del bucle.

#### F4-03 — MEDIO — No existe ninguna validación de longitud máxima en todo el esquema de entrada
`src/utils/validators/` (8 ficheros de esquema)

`grep -rn "\.max(" src/utils/validators/` → **1 sola coincidencia en los 8 ficheros**, y es
`overlayOpacity: z.number().min(0).max(1)` (`eventSchemas.ts:61`). **Ningún campo de texto
tiene `.max()`** y ningún parámetro de paginación tiene tope.

Los campos que respaldan columnas TEXT (`dietaryComments`, `description`, `awardReason`)
aceptan por tanto cadenas arbitrariamente grandes; el único freno es el límite de cuerpo de
petición de Next, no la aplicación. Combinado con F4-01 y F4-02 (ambos sin autenticar), es el
multiplicador del coste de almacenamiento.
**Mala práctica con explotabilidad clara; sin evidencia de explotación.**

#### F4-04 — MEDIO — Paginación sin tope **ni saneamiento numérico**: dos vías al volcado completo
`src/app/api/events/[eventId]/participants/route.ts:18-19`
`src/services/participantService.ts:394, 458-461`

`const limit = parseInt(searchParams.get('limit') || '10')` — sin `Math.min`, sin validación,
sin comprobar `NaN`. Hay **dos** caminos al volcado íntegro, no uno:

1. **`?limit=99999`** — el valor pasa tal cual a `findAndCountAll`.
2. **`?limit=abc` ⇒ `NaN`** — y esto es peor que el anterior: en `listParticipants` el default
   `const { page = 1, limit = 10 }` (`participantService.ts:394`) **solo se aplica a
   `undefined`**, así que `NaN` lo atraviesa; después `if (limit > 0)` (`:458`) es **falso**
   para `NaN`, de modo que **no se asignan `limit` ni `offset` en absoluto** y la consulta
   devuelve la tabla completa. Lo mismo con `page`.

`eventFilterSchema` (`eventSchemas.ts:150-151`) transforma `page`/`limit` con `parseInt` pero
**tampoco** comprueba `NaN` ni pone `.max()`. `src/app/api/audit-logs/route.ts:14` repite el
patrón (autenticado, `[ADMIN]`).

**Cruce obligatorio con la Fase 3:** sobre `GET /api/events/{id}/participants` este defecto es
**alcanzable sin autenticación** (F3-01, eslabón 2). No es un hallazgo independiente tanto como
**el amplificador que convierte F3-01 en volcado de una sola petición**.
**Corrección:** `Math.min(Math.max(parseInt(x) || 10, 1), 100)` y tope en el esquema.

#### F4-05 — MEDIO — Metacaracteres de LIKE sin escapar en todos los filtros de búsqueda
`src/services/participantService.ts:412-418`, `:478-481`; `src/services/eventService.ts:184-186`

Todos los filtros construyen `{ [Op.iLike]: \`%${entrada}%\` }` con la entrada del usuario sin
escapar `%` ni `_`.

**No es inyección SQL** — Sequelize parametriza el *valor*, y el patrón no puede salirse de la
cadena. Lo que sí permite es **subvertir la semántica del filtro**: `search=%%%` (tres
caracteres, supera el mínimo de `query.trim().length < 3` de `searchParticipants`) convierte la
búsqueda en "coincide con todo".

Relevancia real: `searchParticipants` (`participantService.ts:470-492`) es alcanzable **sin
autenticación** por el mismo endpoint de F3-01 (`participants/route.ts:26-29`), y devuelve los
objetos `Participant` **completos, sin lista blanca de atributos, con `guests` incluidos**. El
mitigante es `limit: 10` (`:489`), que sí está fijado en código y no es controlable por el
cliente — por eso esta vía filtra 10 fichas por petición, no el padrón entero. Es la variante
*acotada* de F3-01, no una segunda fuga masiva.
**Corrección:** escapar `%` y `_`, y aplicar lista blanca de atributos en la respuesta.

#### F4-06 — MEDIO — `errorHandler` devuelve `error.message` crudo, también en rutas sin autenticación
`src/utils/errors.ts:69-71`

La última rama de `errorHandler` es `if (error instanceof Error) return { message: error.message }`
— es decir, cualquier error no derivado de `AppError` viaja íntegro al cliente. Se usa así en
`src/app/api/events/[eventId]/participants/route.ts:39-41` y en
`src/app/api/participants/route.ts:19-21`, **ambas rutas sin `withAuth`**.

Verificación concreta: un `eventId` que no sea UUID hace que PostgreSQL responda
`invalid input syntax for type uuid: "..."`, y ese texto se devuelve a un cliente no
autenticado. Es el mismo patrón de F2-05 y F3-07, aquí sobre los sumideros de F3-01 y F1-01.
**Corrección:** mensaje genérico al cliente, detalle solo al log del servidor.

#### F4-07 — BAJO — La subida de ficheros valida el `Content-Type` declarado, no los bytes
`src/app/api/uploads/route.ts:31`

`MIME_EXT[f.type]` confía en el `Content-Type` que **envía el cliente** en la parte multipart.
No hay comprobación de bytes mágicos, así que se puede almacenar contenido arbitrario
declarándolo `image/png`.

**Los mitigantes son fuertes y deliberados, y por eso esto es BAJO y no un hallazgo grave:**
- la extensión se **deriva del mapa MIME**, nunca del nombre original (`route.ts:49`);
- el nombre es `randomUUID()`, no adivinable;
- se almacena **fuera de `public/`** y se sirve por handler, con el motivo documentado en el
  código (`route.ts:52-53`);
- tope de 8 MB (`route.ts:12, 38`);
- **SVG excluido a propósito** con el riesgo de XSS anotado en el comentario (`route.ts:13`);
- `withAuth([ADMIN, OPERATOR])` (`route.ts:62`) — no es una ruta pública.

**No hay ejecución posible:** no hay intérprete sirviendo ese directorio y Next no ejecuta
`.png`. **No es RCE ni webshell.** El riesgo residual es alojar contenido arbitrario en el
dominio (abuso de hosting, y XSS solo si algún día se sirviera con `Content-Type` adivinado).
**Corrección:** validar bytes mágicos con la firma del fichero.

### 3. Sumideros peligrosos — resultado del barrido (conteos descompuestos)

| Sumidero buscado | Coincidencias en `src/` | Veredicto |
|---|---|---|
| `child_process`, `exec(`, `execSync`, `spawn(`, `execFile`, `vm.` | **0** | **No existe camino a inyección de comandos.** |
| `eval(`, `new Function(` | **0** | Sin evaluación dinámica. |
| `sequelize.query(` | **6** (`capacityService.ts:8, 20, 42`; `reportService.ts:88, 107, 332`) | **6/6 con `replacements` y parámetros nombrados** (`:sid`, `:eid`, `:ids`, `:scheduleIds`, `:eventId`). **0 interpolaciones.** Correcto. |
| `literal(` | **~20** | **19 son SQL estático.** Única interpolación: `eventService.ts:174`. Ver §5. |
| `fn(` / `col(` | 20 | Nombres de columna literales en código, ninguno del usuario. |
| `fs.readFile` / `writeFile` con ruta derivada del usuario | **2** (`uploads/route.ts:50`, `uploads/[filename]/route.ts:32`) | Ambos tras `safeFilename` / `randomUUID`. **F1-04 ya confirmó la guarda de traversal.** |
| `dangerouslySetInnerHTML`, `innerHTML` | **0** | **No hay sumidero de XSS por inyección de HTML en todo el proyecto.** |
| `JSON.parse` sobre entrada usada como configuración | 0 en rutas de servidor | `req.json()` es el parser de Next, no un sumidero. |

**Rutas que leen el body: 32 de 52 ficheros `route.ts`.** De ellas, las que escriben sin
autenticación son las tres ya identificadas: `POST /api/participants` (F1-01) y
`POST /api/public/events/[slug]/register` en sus dos ramas (F4-01, F4-02).

### 4. Correcciones a F1-07 — tres vulnerabilidades de dependencias **no son alcanzables**

Esta es la aportación más importante de la fase al plan de remediación, porque **rebaja el
trabajo y cambia la corrección recomendada**, no solo la severidad.

| Dependencia | Afirmación en F1-07 | Verificación de la Fase 4 | Severidad efectiva |
|---|---|---|---|
| `jspdf` + `jspdf-autotable` | **crítica** — LFI/path traversal, inyección PDF con ejecución de JS | **0 usos.** `grep -il "jspdf"` en todo el repo (excl. `node_modules`, `.next`, `.git`) coincide **solo** con `package.json` y `package-lock.json`. Ningún fichero de `src/` la importa. | **Nula — no alcanzable.** **La corrección es eliminar la dependencia, no actualizarla**: evita por completo el cambio incompatible a `jspdf@4.2.1` que F1-07 señalaba como coste. |
| `xlsx` (SheetJS) | alta, **sin parche** — «procesa ficheros subidos por usuarios (rutas `participants/import`, `gift-campaigns/.../import`)» | **La afirmación es incorrecta.** Los 6 módulos que usan `xlsx` son **componentes de cliente** (`'use client'` verificado en `ParticipantImport.tsx:1` y `GiftEmployeeImport.tsx:1`). Los dos únicos `XLSX.read` (`ParticipantImport.tsx:125`, `GiftEmployeeImport.tsx:46`) parsean el fichero **en el navegador de quien lo elige**. Los endpoints de importación **sí existen** pero reciben **JSON ya mapeado en el cliente** (`events/[eventId]/participants/import/route.ts:13-14`, comentado explícitamente en `:9`) y están envueltos en `withAuth([ADMIN, OPERATOR])`. **`xlsx` no está en ningún camino de código de servidor.** | **Baja.** Prototype pollution / ReDoS en la pestaña del propio operador, sobre un fichero que él mismo abre. Sigue sin parche, pero deja de ser prioritario y deja de ser superficie expuesta a Internet. |
| `dompurify` + `@types/dompurify` | moderada — múltiples bypasses de XSS | **0 usos** (`grep -i dompurify src/` → 0). Coherente con los **0** resultados de `dangerouslySetInnerHTML`/`innerHTML`: no hay nada que sanear. **Dependencia muerta.** | **Nula.** Eliminar. |
| `sequelize` GHSA-6457-6jrx-69cr | alta — SQLi vía cast de tipo en columnas JSON | **No alcanzable.** Las 4 columnas JSON/JSONB del modelo (`AuditLog.details:45`, `Event.registrationConfig:123`, `Guest.customData:86`, `Participant.customData:193`) **solo se escriben**: ninguna aparece en una cláusula `where`. No hay rutas anidadas `$tabla.campo$` ni casts `::` controlados por el usuario (los 5 `::int` del SQL crudo son estáticos). | **Baja.** Actualizar por higiene, **no bloqueante**. |

**Consecuencia:** de las 4 vulnerabilidades **críticas** de producción que F1-07 contabilizaba,
las de `jspdf` corresponden a **código que la aplicación nunca ejecuta**. La única crítica que
importa sigue siendo `next` (§Fase 1). El desglose de F1-07 (18 = 4 críticas + 10 altas +
4 moderadas) es correcto como conteo de `npm audit`, pero **sobreestima la exposición real**:
`npm audit` mide dependencias declaradas, no alcanzabilidad. Corregido aquí.

> ⚠️ **Anotación cruzada:** la tabla de F1-07 (§Fase 1.6) debe leerse junto a esta sección.
> Las filas de `jspdf`, `xlsx`, `dompurify` y `sequelize` quedan **matizadas** por lo anterior.
> Las de `next`, `jws`, `lodash`, `minimatch`, `brace-expansion`, `ip-address`, `dottie`,
> `preact`, `sharp` y `uuid` se mantienen sin cambios.

### 5. Lo que resultó estar bien (verificado, no asumido)

1. **SQL crudo íntegramente parametrizado.** Los 6 `sequelize.query()` usan `replacements` con
   parámetros nombrados. **Cero concatenación, cero template literals con entrada del usuario.**
   Este era el candidato número uno del plan para esta fase y **está cerrado**.
2. **La única interpolación en un `literal()` no es explotable.** `eventService.ts:174`
   interpola `${nowStr}` y `${sevenDaysStr}` en un `BETWEEN`, pero ambos se calculan en el
   servidor tres líneas antes (`:167-170`, `new Date().toISOString()`) y **no derivan de
   ninguna entrada del usuario**. El único valor que el usuario controla en ese bloque es
   `filter`, y llega por `z.enum([...])` (`eventSchemas.ts:155`). *Mala práctica* (debería usar
   `replacements`), **no hallazgo**.
3. **La inyección de `ORDER BY` está cerrada por lista blanca.** `eventService.ts:193` hace
   `order = [[sortBy, sortOrder]]` con valores que vienen del usuario — el patrón clásicamente
   vulnerable — pero `eventFilterSchema` los restringe antes con
   `z.enum(['name','createdAt','updatedAt','startDateTime'])` y `z.enum(['ASC','DESC'])`
   (`eventSchemas.ts:153-154`). **La defensa correcta está en el sitio correcto.**
4. **Zod está presente en los límites de entrada**, no solo declarado: 8 ficheros de esquema y
   uso efectivo en las rutas autenticadas de escritura. Incluso `createParticipant` valida con
   `createParticipantSchema.parse` (`participantService.ts:20`), de modo que **F1-01, aun sin
   autenticación, solo puede escribir registros con forma válida** — un matiz que acota su
   impacto respecto a lo reportado en la Fase 1.
5. **El registro público no filtra detalles de error:** `register/route.ts:250` devuelve
   `'Internal server error'` genérico, y `lookup/route.ts:69` igual. Contrasta con F4-06 y
   demuestra que el patrón correcto ya existe en el proyecto — solo no se aplicó de forma
   consistente.
6. **Sin sumideros de XSS por HTML crudo.** Cero `dangerouslySetInnerHTML` y cero `innerHTML`
   en todo el proyecto. **Esto cierra la reserva pendiente de F3-08:** no se encontró XSS
   explotable, así que el riesgo de guardar los tokens en `localStorage` sigue siendo real pero
   **no hay hoy una vía de explotación en el código**. F3-08 se mantiene en MEDIO por diseño,
   no por explotabilidad demostrada.

### 6. Aplicación de R5 en esta fase

No se encontró código ofuscado, binarios, ni ficheros fuera del patrón del proyecto en los
directorios auditados. **No se activa la detención total de R5.**

Nota para la Fase 5, registrada sin calificarla: existe
`.claude/worktrees/busy-mirzakhani-04852e/` con su propio `package.json` y `package-lock.json`.
Corresponde al *worktree* de la rama `claude/busy-mirzakhani-04852e` ya identificada en la
Fase 2 §3 — es un artefacto de Claude Code, no material plantado. **Su verificación formal
pertenece a la Fase 5.**

### 7. Resumen de severidades de la Fase 4

| ID | Severidad | Estado de la evidencia |
|---|---|---|
| F4-01 | **ALTO** | Explotable sin autenticación — prueba en el código |
| F4-02 | **ALTO** | Explotable sin autenticación — prueba en el código |
| F4-03 | MEDIO | Mala práctica con explotabilidad clara; sin evidencia de explotación |
| F4-04 | MEDIO | Explotable sin autenticación (amplifica F3-01) — prueba en el código |
| F4-05 | MEDIO | Explotable sin autenticación, alcance acotado por `limit: 10` |
| F4-06 | MEDIO | Explotable sin autenticación — prueba en el código |
| F4-07 | BAJO | Mala práctica; no hay ejecución posible |

**Reclasificaciones a la baja producidas por esta fase:** `jspdf` (crítica → **no alcanzable**),
`dompurify` (moderada → **no alcanzable**), `xlsx` (alta/prioritaria → **baja, solo cliente**),
`sequelize` GHSA-6457-6jrx-69cr (alta → **baja, no alcanzable**).

### 8. Preguntas abiertas de esta fase

1. **¿Se usa realmente el modo `rut` en algún evento?** F4-01 solo aplica a eventos con
   `registrationConfig.mode === 'rut'`. Si nunca se configuró, el hallazgo es un bug latente en
   vez de una exposición pasada. **No determinable desde el código** (depende de datos).
2. **¿`jspdf` estaba destinada a una función pendiente?** Si la generación de PDF es un
   requisito futuro, la recomendación cambia: instalar `jspdf@4` directamente en vez de
   eliminarla ahora y reintroducir la versión vulnerable después.

---

## Fase 5 — Integridad del código

> **R5 aplicado con máxima severidad. No se activó la detención total: no se encontró ningún
> artefacto que la justificara.** Nada se ejecutó, nada se borró, nada se modificó. Los dos
> únicos ficheros binarios del repositorio se inspeccionaron **leyendo sus 4 primeros bytes**,
> sin abrirlos con ninguna aplicación.

### 1. Veredicto binario

> # NO hay indicios de manipulación del repositorio por un tercero.
>
> El veredicto es **negativo con alta confianza**, y se apoya en verificaciones exhaustivas
> (no muestreadas) sobre las tres superficies donde un atacante con control del servidor
> habría dejado rastro: **historial de git, cadena de suministro y árbol de ficheros**. Las
> tres dan cero.
>
> **Consecuencia operativa: el código puede reutilizarse en la reconstrucción con confianza.**
> No hace falta reescribir desde cero, ni auditar línea por línea buscando puertas traseras, ni
> tratar el repositorio como contaminado. Lo que hay que corregir son los fallos que la
> auditoría ya identificó (F1-01, F3-01, F4-01, F4-02 y el resto), que son **errores propios
> del desarrollo, no código plantado**.

**Matiz honesto sobre el alcance de este veredicto.** Lo que se descarta es la **manipulación
del repositorio**. Esto **no** descarta que el servidor tuviera implantes: un atacante con RCE
en el VPS pudo modificar el código *desplegado*, instalar persistencia en el sistema operativo
o dejar binarios fuera del árbol del proyecto sin tocar jamás el repositorio de git. Esa
distinción importa y no puede resolverse desde aquí: el droplet fue destruido sin imagen
(Fase 1 §8). **El repositorio está limpio; el servidor destruido es indeterminable, de forma
permanente.**

### 2. Resolución del worktree de §5.1 — artefacto legítimo, verificado

La hipótesis de partida (sesión previa de Claude Code del propio usuario) **queda confirmada
por cuatro comprobaciones independientes**, no asumida:

| Comprobación | Resultado |
|---|---|
| `git worktree list` | Lo reconoce como **worktree registrado** del propio repositorio, en `HEAD` desacoplado sobre `0645f4b`. No es un directorio infiltrado que *parezca* un repo. |
| **¿Diverge de `main`?** | **No. `0645f4b` es ancestro directo de `main`** (`git merge-base --is-ancestor` → verdadero; el `merge-base` con `main` **es** `0645f4b`). No contiene ni una línea que no esté ya en la historia de `main`: está *detrás*, no *a un lado*. El `git diff main 0645f4b` son 68 ficheros con **4.261 borrados frente a 285 inserciones**, la firma de retroceder en el tiempo, no de añadir código. |
| **¿Ficheros modificados sin commitear?** | **No. `git status --porcelain` → 0 líneas.** El árbol de trabajo es idéntico byte a byte a su `HEAD`. Nada editado sobre el checkout. |
| **¿Su `package.json` declara dependencias o scripts ausentes en el principal?** | **No. `diff` con el `package.json` de `main` → IDÉNTICOS.** Sus 10 scripts son los mismos (`dev`, `build`, `start`, `lint`, `test`, `test:watch`, `test:coverage`, `db:sync`, `db:seed:users`, `db:seed`). **Cero hooks de ciclo de vida** en ambos. |

**Autoría y fecha coherentes:** commit `0645f4b`, *"Correct seed roles: acreditador user is
OPERATOR"*, de `emmanuelmarcano <emmanuel.marcano.gg@gmail.com>` el **2026-07-03 17:04:46
-0400** — autor confirmado como legítimo. La marca de tiempo del directorio `scripts/` del
worktree (17:04) coincide **al minuto** con la fecha del commit, exactamente lo que produce un
checkout normal.

**Conclusión: el worktree queda descartado como hallazgo.** Es un checkout limpio de un punto
anterior de la propia historia de `main`. La anotación abierta en la Fase 4 §6 se cierra aquí.

### 3. Historial de commits (§5.2) — conteo descompuesto

**31 commits en total** en el historial completo (todas las ramas), **19 de ellos desde
2026-06-01**.

#### 3.1 Identidades — 5 cadenas de autor, 3 personas, 3 correos

| Autor (`%an <%ae>`) | Commits | Veredicto |
|---|---|---|
| `Emmanuel <emmanuel.marcano.gg@gmail.com>` | 12 | Legítimo |
| `emmanuel-ggwp <emmanuel.marcano.gg@gmail.com>` | 6 | Legítimo — mismo correo, otra grafía |
| `Alba Diaz <Alba.daz@andessalud.cl>` | 5 | Legítimo (confirmado por el usuario) |
| `emmanuelmarcano <emmanuel.marcano@kreante.co>` | 4 | Nombre confirmado; **correo distinto** → §3.2 |
| `emmanuelmarcano <emmanuel.marcano.gg@gmail.com>` | 4 | Legítimo — mismo correo, otra grafía |

**Desglose: 31 commits = 22 de la identidad de Emmanuel bajo `@gmail.com` (3 grafías del
nombre) + 5 de Alba Diaz + 4 de `emmanuelmarcano` bajo `@kreante.co`.**
**No aparece ningún nombre ni correo ajeno a las tres personas confirmadas.**

**Committers: 31 = 25 los propios autores + 6 `GitHub <noreply@github.com>`.** Los 6 de GitHub
son las fusiones de los *pull requests* #1 a #5 hechas desde la web, con
`emmanuel-ggwp` como autor. Es el patrón normal de "Merge pull request" y **no es una identidad
adicional**.

#### 3.2 Única observación sobre identidades — `emmanuel.marcano@kreante.co`

Es un **segundo correo del mismo nombre ya confirmado** (`emmanuelmarcano`), con el patrón
típico de "cuenta personal vs. cuenta de trabajo". Sus 4 commits son de contenido perfectamente
coherente con el proyecto (`ce48ed1` *"Fix invalid role in seed-users script"*, `0645f4b`
*"Correct seed roles..."*, `21b6d43` *"Fix TypeScript build errors for Next.js 16 production
build"*, `fc26e95` *"Serve uploaded images from persistent storage and raise limit to 8MB"*) y
`fc26e95` es precisamente el commit que introdujo la guarda de path traversal que **F1-04
verificó como correcta**. Un atacante no escribe la mitigación que luego se valida como buena.

**No lo clasifico como hallazgo.** Se reporta por transparencia porque el enunciado pedía tratar
cualquier correo distinto como hallazgo, y la regla debe aplicarse aunque el resultado sea
benigno. **Confirmación de una línea para el usuario:** ¿es `emmanuel.marcano@kreante.co` tu
cuenta de trabajo?

#### 3.3 Fechas de autor frente a fechas de commit — sin divergencias

**Revisados los 20 commits más recientes uno a uno.** La divergencia máxima es de **51
segundos** (`37f6060`) y la siguiente de **19 segundos** (`fc26e95`); en los 18 restantes autor
y commit coinciden **al segundo**. **No hay ni un solo caso de reescritura de fechas**, que es
la firma habitual de un historial manipulado.

**Aparente anomalía de orden, resuelta:** varios commits de Alba Diaz muestran una hora *más
tardía* que la fusión que los contiene (p. ej. `ccac5a9` a las 19:36 dentro de `ba86234` de las
19:27). **No es manipulación: es diferencia de huso horario.** Emmanuel commitea en **-0400** y
Alba Diaz en **-0300**; normalizadas a UTC, todas las fechas quedan en orden causal correcto.

#### 3.4 Commits con mensaje genérico — explicados, ninguno sospechoso

| Commit | Mensaje | Explicación |
|---|---|---|
| `8831dd1` | `untracked files on main: b54f6d2 ...` | **Tríada de `git stash`.** Estos tres mensajes son los que **git genera automáticamente** al crear un stash (el commit del índice, el de ficheros sin rastrear y el de la entrada). Los tres comparten la marca de tiempo exacta 2026-07-03 12:45:05 -0400, que es como se crean. Su presencia en el historial significa que un *stash* acabó publicado — **desorden de flujo de trabajo, no manipulación**. |
| `fe05f14` | `index on main: b54f6d2 ...` | idem |
| `17022f8` | `On main: Avance?` | idem |
| `afc4705` | `act` | Mensaje pobre de Alba Diaz. Contenido coherente con el proyecto. |
| `ccac5a9` | `Diossss` | Mensaje pobre de Alba Diaz, el último commit del repositorio (2026-07-07). Frustración, no ofuscación. |

**Los mensajes pobres son deuda de proceso, no indicio de compromiso.** Ninguno introduce
ficheros fuera del patrón del proyecto.

### 4. Código ofuscado o codificado (§5.3) — cero coincidencias

Extendida la búsqueda **fuera de `src/`** tal como pedía el plan, sobre la raíz, `scripts/`,
`.claude/` y los ficheros de configuración (excluidos `node_modules/`, `.git/`, `.next/` y el
worktree):

| Patrón | Coincidencias fuera de `src/` |
|---|---|
| `atob(` | **0** |
| `Buffer.from(..., 'base64')` | **0** |
| `eval(`, `new Function(` | **0** |
| `child_process`, `execSync`, `spawnSync` | **0** |
| **Líneas de más de 500 caracteres** en los 251 ficheros rastreados | **0** |

La ausencia total de líneas anormalmente largas es especialmente concluyente: **el código
minificado o empaquetado por un atacante es prácticamente imposible de esconder** de esa
comprobación, y no hay ni una.

Sumado a los **0** resultados dentro de `src/` de la Fase 4 §3, el resultado es
**0 coincidencias en el 100 % del código del proyecto**.

### 5. Cadena de suministro (§5.4) — limpia en las cuatro comprobaciones

| Comprobación | Resultado |
|---|---|
| **Hooks de ciclo de vida** (`preinstall`, `postinstall`, `prepare`, `prepublish`, `prepack`) | **NINGUNO**, ni en el `package.json` principal ni en el del worktree. El vector clásico de persistencia **no está presente**. |
| **Dependencias fuera del registro** (git, http, file, link, tarball) | **NINGUNA.** Las 48 de producción y las 21 de desarrollo son **rangos semver puros**. |
| **`resolved` fuera de `registry.npmjs.org` en `package-lock.json`** | **0 de 733.** El 100 % de las entradas resuelve al registro oficial. Un paquete sustituido por un tarball propio habría aparecido aquí. |
| **Typosquatting** | **Ninguno.** Revisados los 69 nombres declarados: todos son paquetes conocidos y correctamente escritos. `bcryptjs` es el paquete legítimo (distinto de `bcrypt`, no una imitación). Los 5 paquetes que `npm ls --depth=0` muestra sin estar declarados (`@emnapi/core`, `@emnapi/runtime`, `@emnapi/wasi-threads`, `@napi-rs/wasm-runtime`, `@tybys/wasm-util`) son **transitivas legítimas de `sharp`** elevadas por el aplanamiento de npm, no inyecciones. |

*Observación de higiene, ya conocida:* `@types/dompurify` y `@types/lru-cache` están declaradas
en `dependencies` en vez de `devDependencies`. Es un error de empaquetado (ya anotado en
F1-07), **no un indicio de manipulación**.

### 6. Ficheros fuera de patrón (§5.5) — cero

Extendido a directorios ocultos y a `public/` como pedía el plan.

| Comprobación | Resultado |
|---|---|
| **Bit de ejecución** | **251 de 251 ficheros rastreados están en modo `100644`. Cero ficheros `100755`.** Ningún script ejecutable, en ningún punto del árbol. |
| Ficheros **sin extensión** | **NINGUNO.** |
| Ficheros `.sh`, `.php`, `.pl`, `.py`, nombres genéricos (`a.js`, `shell.js`, `test2.php`) | **NINGUNO.** El inventario completo por extensión es: 145 `.ts`, 84 `.tsx`, 5 `.js`, 4 `.json`, 2 `.md`, 2 `.env`, y **un único fichero** de cada uno de `.txt`, `.svg`, `.sql`, `.pptx`, `.html`, `.docx`, `.css`, `.gitkeep`. Los 5 `.js` son exactamente los cinco de configuración ya inventariados en la Fase 0 §5. |
| **`public/`** | Contiene **un solo fichero rastreado: `public/uploads/.gitkeep`.** No hay nada servible estáticamente que un atacante hubiera podido plantar. |
| **`.claude/`** | Solo `launch.json` (rastreado, config de dev ya inventariada en Fase 0) y `worktrees/` (§2). Nada más. |
| **No rastreados y no ignorados** | **2 ficheros: `AUDIT-FINDINGS.md` y `AUDIT-PLAN.md`** — los de esta auditoría. Nada más aparece sin explicación. |

**Los dos únicos binarios del repositorio, verificados sin ejecutarlos:**
`manuales/Manual_AcreditaPro.docx` y `manuales/Manual_AcreditaPro.pptx`. Sus 4 primeros bytes
son `50 4b 03 04` (`PK\x03\x04`), el contenedor ZIP normal de los formatos ofimáticos: **son lo
que dicen ser por su extensión**, no ejecutables renombrados. Ambos entraron en el commit
`37f6060` (2026-07-01, Alba Diaz), **cuyo propio mensaje menciona explícitamente "manuales"**
entre los cambios. Procedencia coherente y trazable. **No se abrieron.**

*Observación menor, sin severidad:* existen en disco `playwright-report/` y `test-results/`
**completamente vacíos** (0 ficheros) y Playwright **no está declarado** en `package.json`. Son
directorios residuales de alguna ejecución de herramientas; al no contener nada, no hay
artefacto que analizar. Se registra por completitud.

### 7. Integridad del build (§5.6) — sin artefactos rastreados

`git ls-files` filtrado por `^(.next|dist|build|out)/`, `*.min.js`, `*.min.css` y `*.map` →
**NINGUNA coincidencia**. **No hay ningún build ni artefacto compilado rastreado por git**, lo
que confirma y cierra la anotación de la Fase 0 §6.8.

**Por qué esto importa:** el escenario de riesgo era un `.next/` commiteado cuyo JavaScript
compilado no correspondiera a las fuentes — la forma más limpia de esconder código en un
repositorio de Next.js. **Ese escenario no puede darse aquí, porque no hay build versionado.**
Todo lo que se despliega se compila desde las fuentes auditadas. El `.next/` local (2026-07-07)
y `tsconfig.tsbuildinfo` están ignorados y se regenerarán en la reconstrucción.

### 8. Confirmación de la entrada de backlog (§3 del encargo)

**Registrada en `TODO.txt`**, en la raíz del repositorio.

- **Fichero elegido:** existía ya un `TODO.txt` **rastreado por git** — el equivalente de
  backlog del proyecto —, de modo que **no se creó `BACKLOG.md`**, conforme a la instrucción.
- **Ubicación:** al final del fichero, bajo un encabezado nuevo `# Backlog de seguridad`
  separado por `---`, respetando el estilo de viñetas con etiqueta en negrita
  (`- **Etiqueta**: ...`) que usa el resto del documento.
- **Contenido:** título, contexto de negocio (padrón precargado con autoconfirmación por RUT y
  la política que `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL` ya expresa en la interfaz pero no en la
  API), propuesta técnica (token de un solo uso, de vida corta, ligado al participante, emitido
  por `lookup` y exigido por `register`), referencia a **F4-01** en `AUDIT-FINDINGS.md`, y la
  marca explícita de que **no bloquea el redespliegue pero debe abordarse antes de operar con
  volúmenes reales**.

> **Nota sobre el estado de `TODO.txt`.** El fichero es heterogéneo: sus primeras 14 líneas son
> ideas de producto en prosa suelta y el resto es una lista de **errores de compilación de
> TypeScript** encabezada por *"This file contains a list of errors that need to be addressed"*.
> Esa lista apunta a rutas `c:\Users\Usuario\...` — **una máquina distinta de la actual** — y
> describe módulos "que no se encuentran" que hoy sí existen: **está obsoleta**. Se respetó la
> instrucción de añadir al fichero existente, pero conviene decidir aparte si esa lista se purga
> o si el backlog de seguridad merece fichero propio. **No se tocó ninguna línea preexistente.**

### 9. Alcance de R1 en esta fase

Ficheros escritos: **2**, ambos autorizados explícitamente — `AUDIT-FINDINGS.md` (R1 de base) y
`TODO.txt` (excepción concedida para §3, en modo *solo añadir*). **Ningún fichero del código
del proyecto fue modificado, creado ni borrado.** R1 sigue vigente sin más excepciones.

---

## Fase 6 — Configuración de despliegue en el repo

### 1. Veredicto

**La redirección de dominio NO se originó en la configuración de Next versionada.** Es una
conclusión firme, no una impresión: `next.config.js` **no declara `redirects()` en absoluto**, y
el manifiesto del build local lo confirma de forma independiente (§3). El síntoma del ataque
vino, por tanto, de la **capa de servidor** (nginx/Caddy, DNS en DonWeb, o el propio proceso
comprometido) — y esa capa **no existe en el repositorio**, de modo que el mecanismo concreto es
**permanentemente indeterminable**, igual que en la Fase 5 respecto a implantes en el servidor.

El hallazgo estructural de esta fase es el reverso de esa frase: **no hay ninguna configuración
de despliegue versionada**. Todo lo que definía cómo corría la aplicación —proceso, proxy
inverso, TLS, cortafuegos, versión de Node, política de actualizaciones— vivía **solo en el
droplet destruido**. Eso explica a la vez por qué el vector no es recuperable y por qué la
aplicación pudo quedarse siete meses en una versión vulnerable sin que nada lo señalara.

### 2. Inventario de configuración de despliegue — conteo descompuesto

Búsqueda sobre **ficheros rastreados por git** (`git ls-files`), no sobre el árbol de trabajo:

| Artefacto buscado | Presente | Evidencia |
|---|---|---|
| `Dockerfile` | **No** | 0 coincidencias |
| `docker-compose.y(a)ml` | **No** | 0 coincidencias |
| Configuración de nginx / `*.conf` / `Caddyfile` | **No** | 0 coincidencias |
| Unidad systemd (`*.service`) | **No** | 0 coincidencias |
| `ecosystem.config.js` (PM2) / `Procfile` | **No** | 0 coincidencias |
| CI/CD (`.github/workflows/`) | **No** | el directorio `.github/` no existe |
| `.nvmrc` / `.node-version` / `.tool-versions` | **No** | 0 coincidencias |
| Campo `engines` en `package.json` | **No** | `grep -n "engines" package.json` → vacío |
| `output: 'standalone'` en `next.config.js` | **No** | 0 coincidencias |
| Cualquier `*.yml` / `*.yaml` rastreado | **No** | 0 coincidencias |
| Script de despliegue | **No** | los 12 ficheros de `scripts/` son **generadores de planillas, migraciones y semillas**, ninguno despliega |

**Total: 0 de 11 artefactos de despliegue versionados.** Lo único relacionado con ejecución que
sí está rastreado es `.claude/launch.json` — configuración de **desarrollo** local (`npm run dev`,
puerto 3000), ya inventariada en la Fase 0; no toca producción y no contiene credenciales.

Esto **confirma y cierra** la anotación de la Fase 0 §5, que había registrado la ausencia sin
extraer todavía sus consecuencias.

### 3. Redirects y rewrites — verificados por partida doble

**En la fuente** (`next.config.js`): la única función de reescritura declarada es `rewrites()`
(`next.config.js:9-18`), con **una** entrada en `afterFiles`:
`/uploads/:file` → `/api/uploads/:file`. **No existe `redirects()`.**

**En el build** (`.next/routes-manifest.json`, build local del 2026-07-07 con Next 16.0.6),
como evidencia independiente de la lectura del fuente:

| Campo del manifiesto | Contenido |
|---|---|
| `redirects` | **Una sola entrada, `"internal": true`** — la normalización de barra final que Next genera siempre (`/:path+/` → `/:path+`, 308). **Ninguna redirección de autor.** |
| `rewrites.beforeFiles` | `[]` — vacío |
| `rewrites.afterFiles` | La entrada de `/uploads/:file`, y nada más |
| `rewrites.fallback` | `[]` — vacío |

`beforeFiles` vacío es el dato que más pesa: es la única fase de reescritura que se ejecuta
**antes** de comprobar ficheros y páginas, y por tanto el único lugar de la configuración de Next
desde el que se podría secuestrar el tráfico de forma general. Está vacío.

El rewrite de `/uploads` es **legítimo y necesario**: `src/utils/uploadsStorage.ts:1-19` documenta
que Next solo sirve como estáticos los ficheros que existían en `public/` en tiempo de build, así
que las subidas posteriores deben pasar por el endpoint API. Su destino es interno
(`/api/uploads/...`), no una URL externa. **No hay proxy hacia dominios de terceros.**

### 4. Optimizador de imágenes — superficie inexistente, no solo desconfigurada

El plan (§6.1) señala `images.remotePatterns` permisivo como habilitador de SSRF. Aquí el
resultado es más fuerte que "está bien configurado":

- `next.config.js` **no declara clave `images`** → rige el valor por defecto, que **no permite
  ningún host remoto**.
- **`next/image` no se importa en ningún fichero de `src/`** (`grep -rl "next/image" src/` → **0**).

**La aplicación no usa el optimizador de imágenes en absoluto.** La superficie de SSRF por esa
vía **no existe**, ni por configuración ni por uso. Descartada.

### 5. Hallazgos

#### F6-01 — Cero configuración de despliegue versionada (ALTO)

**Evidencia:** la tabla de §2 — 0 de 11 artefactos.

**Por qué ALTO pese a no ser explotable.** Conviene decirlo explícitamente para que la severidad
sea auditable: **esto no es una vulnerabilidad**, nadie lo "explota". Se califica ALTO por su
efecto de segundo orden, que sí es medible y sí está documentado en este informe:

1. **Es el habilitador directo de la hipótesis principal.** Sin `engines`, sin `.nvmrc`, sin
   CI que ejecute `npm audit`, y sin Dependabot/Renovate, **nada en el repositorio señalaba** que
   la aplicación estaba una versión de parche por debajo de la corrección de React2Shell
   (16.0.6 vs. 16.0.7) durante siete meses. `package.json:70` declara `^16.0.5`, un rango que
   **habría admitido 16.0.7 con un simple `npm update`** — el retraso no fue una restricción
   técnica, fue ausencia de señal. Esto **cierra F1-06**, que quedaba abierto.
2. **Hace el despliegue irreproducible.** No se puede reconstruir el servidor "como estaba"
   porque no consta cómo estaba. Cada decisión de la reconstrucción es una decisión nueva.
3. **Es la razón por la que el vector no es recuperable** (§1).

**Corrección:** §7 de esta fase especifica qué debe quedar versionado.

#### F6-02 — Cabeceras de seguridad emitidas por dos fuentes divergentes (MEDIO)

**Evidencia:** `next.config.js:19-42` (bloque `headers()`, `source: '/:path*'`) y
`src/middleware/security.ts:15-37` (`securityMiddleware`), aplicado por `src/middleware.ts:28`
con `matcher: '/api/:path*'`.

Las **dos** fuentes fijan el mismo conjunto de cabeceras (HSTS, CSP, `X-Frame-Options`,
`Permissions-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-DNS-Prefetch-Control`,
`X-XSS-Protection`) con ámbitos **distintos y solapados**:

| Ruta | `next.config.js` (`/:path*`) | middleware (`/api/:path*`) | Resultado |
|---|---|---|---|
| `/api/...` | Sí | Sí | **Ambas se ejecutan** |
| Páginas, RSC, estáticos | Sí | **No** | Solo la estática |

> **Corrección de esta ficha (Fase 7, al consolidar).** La primera redacción de F6-02 afirmaba
> que `next.config.js:27` era un *"segundo respaldo comodín independiente que F2-04 no cubría"* y
> que la ausencia de `ALLOWED_ORIGIN` en `.example.env` era aportación de la Fase 6. **Las dos
> cosas son falsas.** F2-04 cita literalmente `src/middleware/security.ts:3` **+**
> `next.config.js:27` y ya señalaba que la variable no figura en la plantilla. **F6-02 no aporta
> nada sobre el comodín de CORS: eso es íntegramente F2-04.** Se deja constancia en lugar de
> corregirlo en silencio, por el mismo criterio con que se registró la premisa fallida de F6-10.

**Lo que sí aporta F6-02, y es lo único:** las dos emisiones **divergen entre sí**, algo que
ninguna fase anterior había comparado.

- **`Access-Control-Allow-Origin`.** `next.config.js:27` emite un valor **estático**
  (`process.env.ALLOWED_ORIGIN || "*"`); `security.ts:7-8` emite el **`Origin` reflejado** de la
  petición. En rutas `/api/*` ambas concurren sobre la misma cabecera.
- **`Access-Control-Allow-Headers`.** La versión del middleware incluye `Authorization`;
  **la de `next.config.js:29` no**. Dado que este es exactamente el mecanismo de autenticación de
  la aplicación (§Fase 3 §4), la configuración estática por sí sola **rompería** cualquier
  llamada autenticada entre orígenes. La aplicación funciona porque el middleware la corrige —
  eso no es una arquitectura, es una coincidencia afortunada.
- **Ámbito.** Las páginas y los endpoints RSC reciben **solo** la copia estática; el middleware no
  los alcanza. Cualquiera que endurezca la CSP editando `security.ts` creerá haber protegido la
  aplicación y solo habrá tocado `/api/*`.

**Severidad de la ficha así acotada: MEDIO** — divergencia de configuración con una consecuencia
funcional demostrable, no una vía de explotación propia. La valoración del CORS permisivo es la de
F2-04 y **no se re-puntúa aquí**.

**Se mantiene el acoplamiento ya registrado:** corregir **F3-08** migrando a cookies **activa** la
explotabilidad de F2-04. Nunca F3-08 en solitario.

**Corrección:** una sola fuente de verdad. Recomendado: dejar las cabeceras **estáticas** en
`next.config.js` (cubren todas las rutas, no solo `/api`) y que el middleware conserve
**únicamente** la lógica de CORS que necesita ser dinámica, eliminando el respaldo `'*'` en ambos
sitios.

#### F6-03 — CSP inefectiva y cabeceras contradictorias u obsoletas (MEDIO)

**Evidencia:** `next.config.js:33` y `src/middleware/security.ts:18` (la misma cadena, duplicada).

- **`script-src 'self' 'unsafe-inline' 'unsafe-eval'`** — con ambos permisos, la CSP **no aporta
  defensa frente a XSS**; queda como declaración sin efecto práctico.
- **`img-src 'self' data: https:`** — `https:` admite **cualquier** host TLS; permite exfiltración
  por URL de imagen.
- **`X-Frame-Options: SAMEORIGIN` (`:35`) contra `frame-ancestors 'none'` (dentro de la CSP)** —
  se contradicen. Los navegadores modernos hacen prevalecer `frame-ancestors`, así que el
  resultado efectivo es el más restrictivo y **no hay riesgo**, pero la contradicción indica que
  las dos cabeceras se escribieron sin contrastarlas.
- **`X-XSS-Protection: 1; mode=block` (`:34`)** — cabecera **obsoleta**; la guía actual es
  emitir `0` o no emitirla.

**Calificación honesta del impacto:** esto es **endurecimiento, no el vector**. La Fase 4 no
encontró XSS (0 `dangerouslySetInnerHTML`), y una CSP —por estricta que fuese— **no habría
detenido React2Shell**, que es ejecución de código **en el servidor**, antes de que ninguna
cabecera llegue a un navegador. Se registra por completitud, no como línea de defensa perdida.

#### F6-04 — `DB_SSL` no se puede desactivar en producción, y la validación de certificado está apagada (ALTO)

**Evidencia:** `src/lib/sequelize.ts:10` y `:27`.

```
const useSSL = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';
...
dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
```

Dos problemas, y el primero **bloquea la reconstrucción ya decidida**:

1. **`DB_SSL=false` no tiene efecto.** El `||` hace que `NODE_ENV === 'production'` fuerce SSL
   **con independencia** del valor de `DB_SSL`. El comentario de `:9` explica el porqué —la
   aplicación se escribió contra una **base de datos administrada de DigitalOcean**, que exige
   SSL—, pero la decisión tomada para la reconstrucción es **PostgreSQL autoalojado en el mismo
   droplet, sobre localhost o socket Unix**, que por defecto **no habla SSL**. Con
   `NODE_ENV=production`, la aplicación **no conectará**, y no hay variable que lo evite: hay que
   tocar el código. **Encontrado antes de que muerda, no después.**
2. **`rejectUnauthorized: false`** desactiva la validación del certificado del servidor. Sobre
   `localhost` es inocuo; sobre cualquier conexión que salga de la máquina convierte el SSL en
   cifrado sin autenticación, es decir, **sin protección frente a un intermediario**. Es un
   parámetro que se pone para que "funcione" y que nadie vuelve a mirar.

**Corrección:** que `DB_SSL` sea la **única** fuente de decisión (`process.env.DB_SSL === 'true'`,
sin el `||`), declararla obligatoria en la plantilla de entorno, y usar `rejectUnauthorized: true`
con la CA correspondiente en cuanto la conexión no sea local.

#### F6-05 — Plantilla de entorno incompleta y sin validación al arranque (MEDIO)

**Evidencia:** comparación entre las variables **leídas por el código** y las **declaradas en la
plantilla**. Conteo descompuesto:

| | Variables |
|---|---|
| Leídas vía `process.env.*` en `src/`, `scripts/`, `next.config.js` | **11** — `NODE_ENV`, `ALLOWED_ORIGIN`, `DATABASE_URL`, `UPLOADS_DIR`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `DB_SSL`, `NEXT_PUBLIC_EMAILJS_SERVICE_ID`, `NEXT_PUBLIC_EMAILJS_PUBLIC_KEY` |
| Declaradas en `.example.env` | **10** |
| **Leídas pero ausentes de la plantilla** | **2 — `ALLOWED_ORIGIN` y `DB_SSL`** |
| Declaradas en la plantilla pero **nunca leídas** | **1 — `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL`** (F6-10) |

Las dos que faltan son, precisamente, **las dos que gobiernan una política de seguridad**: el
origen permitido para CORS y el transporte cifrado a la base de datos. Quien despliegue siguiendo
`.example.env` **no sabrá que existen** y heredará los valores por defecto, que en ambos casos son
los permisivos.

**Atribución honesta de lo que es nuevo aquí** (revisado en la Fase 7): la ausencia de
`ALLOWED_ORIGIN` en la plantilla **ya la había registrado F2-04**, y es la mitad del hallazgo
que le da nombre. Lo que aporta la Fase 6 es (a) la ausencia de **`DB_SSL`**, que nadie había
mirado y que resulta ser la variable de F6-04; (b) el **conteo completo 11 vs. 10**, que convierte
una observación puntual en una comprobación sistemática; y (c) la variable **sobrante** del sentido
contrario (F6-10). El resto es F2-04.

**No hay validación de entorno al arranque.** `src/lib/sequelize.ts:12` usa
`process.env.DATABASE_URL || ''`: con la variable ausente, la aplicación **arranca igual** y falla
más tarde, en la primera consulta, con un error que no señala la causa. Esto **cierra la mitad de
despliegue de F2-07**: el patrón correcto es abortar el arranque con un mensaje explícito, la
misma exigencia que la Fase 3 §7 impuso a los secretos de firma.

#### F6-06 — `dotenv.config()` en el código de aplicación, combinado con un `.env` rastreado (MEDIO)

**Evidencia:** `src/lib/sequelize.ts:2,4` — `import * as dotenv from 'dotenv'; dotenv.config();`,
ejecutado al **importar el módulo**; y `.env` **rastreado por git** desde el commit `37f6060`
(Fase 0 §6.1), en un **repositorio público**.

Un despliegue por `git clone` + `npm ci` + `npm start` —el método más probable en un VPS sin
configuración versionada (F6-01)— **deja el `.env` de desarrollo en el directorio de despliegue**,
y `dotenv.config()` lo carga desde el directorio de trabajo.

**Atenuante verificado, para no inflar la severidad:** `dotenv.config()` **no sobrescribe**
variables ya presentes en `process.env`. Si el entorno lo inyecta el gestor de procesos
(`Environment=`/`EnvironmentFile=` en systemd), **esos valores ganan** y el fichero solo rellena
huecos. El riesgo es real pero **condicionado** a que el entorno se provea únicamente por fichero.

**Sigue siendo el peor de los mundos como práctica:** el valor efectivo de una variable depende de
qué capa la definió primero, sin que nada lo haga visible. Y mantiene vivo el defecto de higiene
—un `.env` versionado en repositorio público— cuya baja severidad **depende por completo** de la
afirmación, ya confirmada por el usuario, de que sus valores son de desarrollo.

**Corrección:** `git rm --cached .env` (deja de rastrearse; `.gitignore:16` ya lo cubre para el
futuro), eliminar `dotenv.config()` del código de aplicación —Next carga `.env*` por sí mismo, y
en producción el entorno lo debe inyectar systemd— y conservarlo, si acaso, solo en los scripts de
`scripts/` que se ejecutan con `tsx` fuera de Next.

#### F6-07 — `X-Powered-By: Next.js` no desactivado (BAJO)

**Evidencia:** `next.config.js` **no declara `poweredByHeader`**, cuyo valor por defecto es
`true`. Toda respuesta anuncia el framework.

Se registra por su relación directa con la hipótesis principal: la explotación de React2Shell fue
**masiva y automatizada**, y ese barrido se apoya en la identificación remota de despliegues de
Next.js. Quitar la cabecera **no es una defensa** —el fingerprinting de Next tiene otras vías
igual de fiables, empezando por las rutas `/_next/`— y por eso es BAJO y no más. Pero es una línea
de configuración que reduce gratuitamente la visibilidad ante un escaneo indiscriminado.

**Corrección:** `poweredByHeader: false`.

#### F6-08 — `UPLOADS_DIR` apunta por defecto dentro del directorio de despliegue (BAJO)

**Evidencia:** `src/utils/uploadsStorage.ts:15-16` —
`process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')`.

El propio fichero documenta en `:11-14` que en producción conviene una ruta absoluta y estable
fuera del directorio de deploy, **pero nada lo obliga**: `.example.env:` declara `UPLOADS_DIR` sin
valor orientativo, y el respaldo silencioso escribe bajo `process.cwd()`. Las subidas
**desaparecen en el siguiente redespliegue**.

Es disponibilidad más que seguridad —de ahí BAJO—, pero tiene una arista de seguridad en la
reconstrucción: una unidad systemd con `ProtectSystem=strict` necesita declarar `ReadWritePaths`
sobre ese directorio, y si la ruta es relativa al despliegue, el endurecimiento y la funcionalidad
entran en conflicto. **Fijar la ruta absoluta es requisito previo al sandbox de systemd**, no una
mejora posterior.

**Nota de alcance:** la validación del nombre de fichero (`safeFilename`,
`uploadsStorage.ts:53-62`) rechaza `..`, `/`, `\` y cualquier carácter fuera de
`[a-zA-Z0-9._-]`, y exige extensión de una lista blanca de cuatro. **La ruta de escritura no es
un path traversal**; el hallazgo es exclusivamente de ubicación y persistencia.

#### F6-09 — `webpack` y `turbopack` declarados simultáneamente (BAJO)

**Evidencia:** `next.config.js:6-8` (clave `turbopack`, con el objeto vacío) y `:43-49`
(hook `webpack`, que hace `config.externals.push('sequelize')` cuando `!isServer`).

Los dos bundlers están declarados en el mismo fichero. El hook de `webpack` **solo se ejecuta si
el build corre con webpack**; bajo Turbopack queda inerte.

> **Resuelto en la Fase 7 — pasa de "no verificable" a verificado.** La primera redacción decía
> que no podía determinarse el bundler porque `.next/diagnostics/` registra la versión y la etapa
> del build pero no el empaquetador. **Se buscó en el sitio equivocado.** El build local sí lo
> declara en dos lugares independientes:
> `.next/build-manifest.json` lista el chunk de cliente **`static/chunks/turbopack-*.js`**, y
> `.next/required-server-files.json` contiene una clave de configuración **`"turbopack"`**.
> Además existe el directorio `.next/build/` con chunks de servidor nombrados
> `[root-of-the-server]__*._.js`, convención propia de Turbopack.
> **El build corrió con Turbopack, luego el hook `webpack()` de `next.config.js:43-49` no se
> ejecutó.** El usuario confirmó (Fase 7, P3) que el build se hizo **sin forzar bundler**, de modo
> que en producción rigió el mismo valor por defecto: **el hook estaba inerte también allí.**

**Impacto acotado, por no exagerarlo:** la exclusión que el hook aplica es de `sequelize` **en el
cliente**, y `serverExternalPackages: ['sequelize']` (`:5`) ya cubre el lado servidor. Que el hook
no corra **no explica F2-02** (el módulo de firma JWT llegando al bundle de cliente): esa causa,
ya establecida en la Fase 2, es la ausencia de `server-only` y la cadena de importaciones, no el
bundler. **Ambos hallazgos son independientes.**

**Corrección:** decidir un bundler, dejar solo su clave, y trasladar cualquier exclusión que
importe a `serverExternalPackages` o a `server-only`, que son independientes del bundler.

#### F6-10 — `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL` está declarada y no se lee en ninguna parte (BAJO) — **corrige una premisa de F4-01**

**Evidencia:** `git grep "MODIFY_CONTACT"` sobre **todos** los ficheros rastreados devuelve
exactamente **2 coincidencias, ambas en ficheros de entorno** (`.env` y `.example.env`).
**Cero coincidencias en `src/`**, en cualquier extensión.

**Por qué esto importa más que su severidad.** La entrada de backlog derivada de F4-01
(hoy **SB-01** en `SECURITY-BACKLOG.md`) argumenta que *"el producto ya decidió que la
automodificación pasa por una persona"*, apoyándose en que esta variable muestra en la landing un
aviso de "si quieres modificar, comunícate a...". **Esa premisa no se sostiene:** la variable
existe en la configuración, pero **ningún componente la consume**. Lo más que puede afirmarse es
que **alguien tuvo la intención** de implantar esa política; el código no la implanta **ni en la
interfaz ni en la API**.

La conclusión de F4-01 **no cambia** —la rama de modo `rut` sigue permitiendo escritura sin
autenticar, y su corrección mínima sigue siendo bloqueante—, pero **pierde el apoyo retórico** de
"la interfaz ya cierra esta puerta". SB-01 queda corregida en consecuencia.

Se deja constancia además de una **matización a la Fase 2**: el `.env` rastreado se clasificó como
portador de "valores de desarrollo", y esta variable contiene una dirección de correo de un
dominio corporativo real. **No altera la severidad** —es una variable `NEXT_PUBLIC_`, pensada por
diseño para ser visible en el cliente, y una dirección de correo no es un secreto—, pero conviene
registrarlo: el fichero versionado **no es uniformemente de desarrollo**. R2 se respeta: se nombra
la variable, no se reproduce el valor.

### 6. Resumen de severidades de la Fase 6

| ID | Severidad | Estado de la evidencia |
|---|---|---|
| F6-01 | **ALTO** | Hecho verificado; no explotable — riesgo de segundo orden, justificado en el propio hallazgo |
| F6-04 | **ALTO** | Defecto verificado en el código; **bloquea el arranque** de la reconstrucción decidida |
| F6-02 | MEDIO | Configuración divergente verificada; extiende F2-04 sin re-puntuarla |
| F6-03 | MEDIO | Mala práctica; **no** es el vector y no lo habría detenido |
| F6-05 | MEDIO | Hecho verificado por conteo; cierra la mitad de despliegue de F2-07 |
| F6-06 | MEDIO | Riesgo real pero **condicionado** a que el entorno se provea solo por fichero |
| F6-07 | BAJO | Hecho verificado; reduce visibilidad, no es defensa |
| F6-08 | BAJO | Hecho verificado; disponibilidad, con arista de seguridad en el sandbox |
| F6-09 | BAJO | Incoherencia de configuración; efecto **no verificable** desde el repositorio |
| F6-10 | BAJO | Hecho verificado; **corrige una premisa** de F4-01/SB-01 |

**Hallazgos cerrados en esta fase:** **F1-06** (versión de Node sin fijar → F6-01) y la mitad de
despliegue de **F2-07** (validación de entorno → F6-05).

### 7. Qué configuración debe quedar versionada en la reconstrucción

Esta es la mitad de la fase que produce trabajo, no diagnóstico. Deriva de F6-01: la reconstrucción
es la ocasión de que la infraestructura deje de vivir solo en la máquina.

| Qué | Por qué | Cierra |
|---|---|---|
| **`engines.node`** en `package.json` + **`.nvmrc`** con la misma versión | Fija el tiempo de ejecución; hoy no consta con qué Node corría | F6-01, F1-06 |
| **Dependabot o Renovate** (`.github/dependabot.yml` bastaría) | **La medida de mayor impacto de toda la fase.** Es lo que habría avisado del salto 16.0.6 → 16.0.7 en diciembre de 2025 | F6-01 |
| **Unidad systemd** versionada: `User=` sin privilegios, `ProtectSystem=strict`, `PrivateTmp=`, `NoNewPrivileges=`, `ReadWritePaths=` sobre el `UPLOADS_DIR` absoluto, `EnvironmentFile=` con permisos `600` | Hace reproducible el proceso y **documenta** el endurecimiento; el `ReadWritePaths` depende de fijar antes la ruta absoluta | F6-01, F6-08 |
| **Configuración de nginx** versionada: `proxy_pass` a `127.0.0.1`, terminación TLS, `server_name` explícito con `default_server` que rechace hosts desconocidos | Es **la capa donde probablemente se materializó la redirección** (§1). Versionarla convierte un cambio no autorizado en un `git diff` | F6-01 |
| **`.example.env` completo**: las 11 variables leídas, con `ALLOWED_ORIGIN` y `DB_SSL` incluidas, y `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL` retirada o implementada | Hoy la plantilla omite justamente las dos que gobiernan políticas de seguridad | F6-05, F6-10 |
| **Validación de entorno al arranque** (esquema Zod en un módulo importado por el arranque, que **aborte** si falta algo) | Un fallo de configuración debe ser ruidoso e inmediato, no silencioso y diferido | F6-05, F2-07 |
| **`poweredByHeader: false`** y una sola fuente de cabeceras | Elimina la divergencia de F6-02 y la huella gratuita de F6-07 | F6-02, F6-07 |
| **`UPLOADS_DIR` apuntando a una ruta externa persistente**, p. ej. `/var/lib/tuacreditacion/uploads`, **fuera del directorio de despliegue** | Los ficheros subidos deben sobrevivir a cada redespliegue. El handler `src/app/api/uploads/[filename]/route.ts:30` ya lee de esta variable: **no hay que tocar código, solo configurar** | F6-08 |
| **`output: 'standalone'`** — **trasladado al runbook de reconstrucción** | Decisión **recomendada pero no cerrada**, por indicación del usuario (Fase 7, P1). Razón de aplazarla: se decide **con la unidad systemd y el script de despliegue delante**, porque cambia el layout del árbol desplegado. No es requisito de esta especificación | — |

> **Prohibición explícita: no usar un enlace simbólico en `public/uploads` para resolver la
> persistencia.** Es la solución "obvia" y **rompe un control de seguridad verificado**. El
> rewrite `/uploads/:file` → `/api/uploads/:file` está declarado en **`afterFiles`**
> (`next.config.js:14-16`, confirmado en el manifiesto del build, §3), y `afterFiles` se evalúa
> **después** de comprobar ficheros estáticos. Un symlink dentro de `public/` haría que **Next
> sirviera los ficheros directamente** y el rewrite no llegaría a dispararse: el handler dejaría
> de ejecutarse y con él **`safeFilename`** (`src/utils/uploadsStorage.ts:53-62`), la guarda que
> **F1-04 verificó como correcta** contra path traversal. Se cambiaría un problema de persistencia
> por la anulación silenciosa de un control que hoy funciona. **La vía correcta es
> `UPLOADS_DIR`.** Esto pesa más aún con `standalone`, que reconstruye el árbol desde cero.
>
> **CONFIRMADO EMPÍRICAMENTE (2026-07-27) — y el aviso llegaba tarde.** El usuario informó de que
> el despliegue anterior **ya usaba exactamente ese symlink**. Este párrafo, escrito como
> advertencia preventiva, describía en realidad **el estado que ya existía**: el handler y
> `safeFilename` **no estaban en el camino de lectura en producción**. La frase *"un control que
> hoy funciona"* es incorrecta en ese sentido y se deja tal cual, con esta corrección al lado, por
> el criterio de §7.0. **La especificación válida —lectura servida por Nginx con lista blanca y
> `nosniff`, escritura por `UPLOADS_DIR`— está en §7.4 y sustituye a este párrafo.**

**Fuera del repositorio, y por eso no es un hallazgo de esta fase:** doble cortafuegos (Cloud
Firewall + UFW), PostgreSQL escuchando solo en localhost con usuario sin `SUPERUSER`, Certbot,
backups cifrados fuera de la máquina, auditd/AIDE. Va en el runbook de reconstrucción, no en el
árbol de fuentes. **Se mantiene la recomendación de no usar Docker**: publica puertos saltándose
UFW, que es exactamente el modo de fallo que esta reconstrucción debe evitar.

### 8. Aplicación de R5 en esta fase

**No se activa.** No apareció ningún fichero de configuración inesperado, ofuscado ni ajeno al
patrón del proyecto. El resultado de §2 es la **ausencia** de artefactos, no la presencia de
artefactos extraños — que es una conclusión distinta y menos alarmante.

### 9. Alcance de R1 en esta fase

Ficheros escritos: **2**, ambos dentro de la excepción concedida — `AUDIT-FINDINGS.md` (R1 de
base) y `SECURITY-BACKLOG.md` (creación autorizada). Además se **revirtió** `TODO.txt` a su estado
exacto en HEAD (`git restore`), tras verificar por `git diff --stat` que la única diferencia eran
las **44 líneas insertadas** en la Fase 5 y **ninguna línea preexistente modificada**. **Ningún
fichero del código del proyecto fue modificado, creado ni borrado.**

### 10. Preguntas abiertas de esta fase — **las tres cerradas por el usuario (2026-07-27)**

1. **¿Cómo se ejecutaba la aplicación en el droplet?** → **RESUELTA.** Es la aplicación de
   **`tuacreditacion.cl`**, desplegada con **PM2 ejecutando `next start`, detrás de Nginx como
   proxy inverso**, sobre **Ubuntu 24.04**. Consecuencias, ambas relevantes:
   - **El servidor Node integrado de Next SÍ estaba en uso**, luego la superficie del handler de
     upgrade WebSocket (GHSA-c4j6-fc7j-m34r) **existía**. Cierra la Fase 1 §2, que quedaba como
     *"no verificable desde el código"*: pasa a **verificada**.
   - **Había Nginx delante** (pregunta 2, también resuelta): es la ubicación más probable de la
     redirección, y su configuración **no estaba versionada** (F6-01), así que el cambio concreto
     es irrecuperable.
   - El build se hizo **sin forzar bundler**, dato que resuelve **F6-09**.
2. **¿Nginx delante, editado a mano?** → **RESUELTA en su primera mitad** (sí había Nginx). Que su
   configuración se editara a mano en el servidor no puede confirmarse ni desmentirse: la máquina
   ya no existe. Se traslada a §7.5 de la Fase 7 como **indeterminable**.
3. **`NEXT_PUBLIC_MODIFY_CONTACT_EMAIL`: ¿implementar o retirar?** → **RESUELTA: implementar.**
   Decisión del usuario: **un participante ya inscrito NO puede modificar sus datos por sí mismo;
   debe comunicarse con un contacto humano.** Esto **cambia la corrección de F4-01** —se cierra el
   camino de escritura en vez de asegurarlo— y **deja SB-01 sin objeto**. Desarrollado en la
   Fase 7 §7.3, Bloque A.

---

# Fase 7 — Reporte y plan de remediación

> **Esta sección se lee sola.** Está escrita para alguien que no siguió la auditoría: no hace
> falta haber leído las Fases 0-6 para actuar con ella. Las referencias `Fn-nn` remiten hacia
> arriba solo para quien quiera el detalle.
>
> Aplicación: **`tuacreditacion.cl`** — sistema de acreditación de eventos. Next.js 16.0.6
> (App Router), React 19.2.0, Sequelize 6.37.7 + PostgreSQL, npm, TypeScript. Corría con **PM2
> ejecutando `next start` detrás de Nginx**, sobre Ubuntu 24.04, en un droplet de DigitalOcean
> **comprometido en julio de 2026 y destruido sin snapshot**.

## 7.0 Correcciones producidas al consolidar

Consolidar obligó a revisar afirmaciones de fases anteriores contra el conjunto. **Siete no
sobrevivieron**, y se corrigen aquí en vez de dejarlas contradiciéndose en silencio. La séptima no
salió de consolidar sino de **ejecutar** la corrección, que es un filtro más severo.

| Qué se afirmó | Qué es cierto | Dónde queda corregido |
|---|---|---|
| **F6-02:** `next.config.js:27` era un segundo respaldo comodín de CORS *"que F2-04 no cubría"*, y la ausencia de `ALLOWED_ORIGIN` en la plantilla era aportación de la Fase 6 | **Falso en ambas mitades.** F2-04 cita literalmente `security.ts:3` **+** `next.config.js:27` y ya señalaba la ausencia en la plantilla. F6-02 **no aporta nada sobre el comodín**; su único aporte real es la **divergencia** entre las dos emisiones, que nadie había comparado | Ficha F6-02, nota al inicio |
| **F6-09:** no podía determinarse qué bundler corrió el build | **Sí podía** — se buscó en el fichero equivocado. `build-manifest.json` lista `static/chunks/turbopack-*.js` y `required-server-files.json` tiene clave `"turbopack"`. **Corrió Turbopack; el hook `webpack()` estaba inerte**, también en producción | Ficha F6-09, nota |
| **Fase 1 §2:** *"no pude verificar el modo de arranque real"*, luego la superficie del handler de upgrade WebSocket quedaba en condicional | **Verificado: PM2 + `next start`.** El servidor Node integrado **estaba en uso** y esa superficie **existía**. Deja de ser una atenuación apoyada en una incógnita | Fase 1 §2, nota de cierre |
| **Fase 4 §8 Q1:** *"¿se usa el modo `rut` en algún evento? No determinable desde el código"* | **Determinado por el usuario, aunque no desde el código:** **no hubo eventos reales con participantes reales** antes del compromiso. F4-01 y F3-01 son **bugs encontrados a tiempo, no exposiciones consumadas** | §7.1 y §7.5 |
| **F1-04:** `safeFilename` clasificada como *"control correcto"* que cerraba el path traversal en `/api/uploads`, con la implicación tácita de que **protegía la lectura de ficheros en producción** | **La guarda es correcta — pero no estaba en el camino de lectura.** En el despliegue anterior los ficheros se servían por un **symlink dentro de `public/`**, y los estáticos ganan al rewrite de `afterFiles`: el handler nunca se ejecutaba. **Confirmación empírica** de lo deducido en la Fase 6 §3, llegada después de cerrar la fase. **La clasificación no cambia y el recuento tampoco**: cambia qué se creía que protegía | Ficha F1-04, §7.2 y §7.4 |
| **Fase 1 §1 y §7.1:** `GHSA-9qr9-h5gf-34mp` **=** `CVE-2025-55182`, presentados como el mismo identificador | **No son intercambiables.** La API de GitHub devuelve `cve_id: null` para `GHSA-9qr9-h5gf-34mp` (advisory del lado **Next.js**, paquete `next`, parche 16.0.7 en la rama 16). `CVE-2025-55182` mapea a `GHSA-fv66-9v8q-g76r`, advisory del lado **React**, paquetes `react-server-dom-*`. **Misma vulnerabilidad de fondo —React2Shell—, dos advisories distintos.** No cambia nada práctico: el que aplica aquí es el de Next y A7 lo supera | Fase 1 §1 (nota bajo la tabla), §7.1 |
| **F3-01 y §7.3 A1:** la lista de roles para los tres `GET`, dada como `[ADMIN, OPERATOR]` en la ficha y como `[ADMIN, OPERATOR, GUARD]` en el plan | **Las dos incorrectas, y contradictorias entre sí.** Ninguna incluye `MANAGER`, a quien `Sidebar.tsx:23` encamina a `/participants`: ambas le habrían devuelto **403 en su propia pantalla**. La ficha además se quedaba corta con `GUARD`, que necesita el padrón para buscar en el panel de acreditación (`SearchParticipant.tsx:19,28` → `participantStore.ts:86`). Listas aplicadas: `[ADMIN, MANAGER, OPERATOR, GUARD]` para el padrón, `[ADMIN, MANAGER, OPERATOR]` para la ficha y los acompañantes | Ficha F3-01 (nota tras la corrección), fila A1 de §7.3 |

Se añaden a las dos correcciones que las propias fases ya habían registrado —el conteo de rutas
por método HTTP (Fase 3 §2) y la premisa fallida de `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL`
(F6-10)—. **Nueve correcciones en total.** Se dejan visibles a propósito: un informe que solo
muestra sus aciertos no permite calibrar cuánto fiarse del resto.

**La quinta merece una lectura aparte.** Las cuatro primeras son errores de análisis corregidos
con evidencia del propio repositorio. Esta no: el razonamiento sobre `afterFiles` era **correcto y
se escribió antes de conocer el dato**, y aun así el informe sacó de él la conclusión defensiva
equivocada — se advirtió *"no introduzcáis un symlink"* sin preguntarse **si ya había uno**. La
Fase 6 tenía delante todo lo necesario para plantear la pregunta y no la planteó. **Deducir
correctamente el mecanismo no equivale a comprobar el estado real**, y esa distinción es
justamente la que separa una auditoría de código de una auditoría de sistema.

**La sexta tiene otra procedencia, y conviene separarla de las anteriores.** Las cinco primeras
son fallos de análisis: se miró el repositorio y se concluyó mal. Esta no nació del análisis del
código sino de **material externo aportado en la conversación** y aceptado sin contrastar — el
mismo material cuya procedencia la Fase 1 §1 ya marcaba explícitamente como *«no verificados de
forma independiente desde este entorno»*. La advertencia estaba escrita; lo que faltó fue actuar
en consecuencia y comprobar el identificador antes de propagarlo a tres secciones.

Se detectó al ejecutar **A7**, consultando la API de GitHub como **fuente primaria**. La regla que
deja es simétrica de la que rige para el código: **el informe puede estar equivocado, y un
identificador aportado de fuera no adquiere autoridad por repetirse en tres sitios del
documento.** Un dato heredado sin verificar es un dato pendiente de verificar, aunque venga de
fuentes reputadas y aunque su sustancia acabe siendo correcta — que aquí lo es.

**La séptima es de otra clase, y es la más incómoda de las nueve.** No la destapó consolidar ni
una fuente externa, sino **ejecutar la corrección**: al ir a aplicar A1 hubo que decidir una lista
de roles concreta, y ahí se vio que el informe daba **dos listas distintas en dos sitios** —
`[ADMIN, OPERATOR]` en la ficha F3-01, `[ADMIN, OPERATOR, GUARD]` en la fila A1 de §7.3— sin que
nadie hubiera notado la contradicción. **Ninguna de las dos era correcta.**

Lo que falló no fue la detección del agujero, que era sólida y está probada, sino **el diseño de
su tapón**: la ficha razonó *«los `GET` deben llevar los roles de sus `PUT`/`DELETE` hermanos»*,
que suena a simetría y es un criterio equivocado — **leer y escribir no tienen los mismos
consumidores**. Nadie miró qué pantallas llaman a cada endpoint hasta que hubo que escribir el
código. La lista correcta no sale del fichero de la ruta: sale de los `RoleGuard` de las pantallas
que la consumen, y eso obliga a recorrer la cadena `componente → store → URL`.

**La regla que deja:** una corrección propuesta en un informe es una **hipótesis** hasta que se
implementa. Detectar bien un fallo no garantiza haber diseñado bien su arreglo, y un plan de
remediación merece el mismo escrutinio que el hallazgo que lo motiva. De haberse aplicado
cualquiera de las dos listas tal cual, A1 habría cerrado una fuga de PII **rompiendo a la vez** la
pantalla de Participantes de `MANAGER` —y, con la lista de la ficha, la acreditación en puerta de
`GUARDIA`—: una regresión funcional introducida por una corrección de seguridad, que es
exactamente el modo de fallo que las reglas W2 y W3 existen para evitar.

## 7.1 Veredicto consolidado sobre el vector

### Hipótesis principal: React2Shell — confianza alta, sin prueba

**RCE sin autenticación** en el protocolo React Flight de React Server Components. **CVSS 10.0**,
publicado el **3 de diciembre de 2025**. Divulgada popularmente como **React2Shell**.

**Identificadores — no son intercambiables** (rectificado el 2026-07-27; ver §7.0, sexta
corrección, y la nota de la Fase 1 §1):

| Identificador | Lado | Aplica a este repositorio |
|---|---|---|
| **`GHSA-9qr9-h5gf-34mp`** | **Next.js** (`next`) | **Sí.** Es el advisory que gobierna aquí. Parche de la rama 16: **16.0.7**. Sin CVE asignado según la API de GitHub (`cve_id: null`) |
| **`CVE-2025-55182`** → `GHSA-fv66-9v8q-g76r` | **React** (`react-server-dom-*`) | Indirectamente: `next` vendoriza esos paquetes en `dist/compiled`, sin entrada propia en el lockfile |

Misma vulnerabilidad de fondo, dos advisories. El informe los presentó como equivalentes; **no lo
son**, aunque la conclusión práctica no varía.

| Elemento | Estado |
|---|---|
| Rango afectado | Next.js 15.0.0 – **16.0.6** |
| Versión corregida | **16.0.7** |
| Versión desplegada | **16.0.6** — resuelta del lockfile, no del rango de `package.json` |
| Distancia al parche | **Una única versión de parche**, durante **siete meses** |
| Superficie requerida | App Router con RSC — **confirmada** (`src/app/`, 0 ficheros en `src/pages/`) |
| Disparo | Una sola petición **POST**. No requiere autenticación ni conocer la aplicación |
| Explotación en circulación | **Masiva y automatizada**, documentada por Cloudflare, Trend Micro y Rescana; incluida en el **KEV de CISA** |

**Por qué encaja.** No hacía falta ser un objetivo elegido: un VPS autoalojado, sin parchear y
localizable por barrido cumplía todos los requisitos. `package.json:70` declaraba `^16.0.5`, un
rango que **habría admitido 16.0.7 con un simple `npm update`** — el retraso no fue una
restricción técnica sino **ausencia de señal**, porque no había `engines`, ni CI, ni Dependabot,
ni nada que avisara (**F6-01**).

**Por qué sigue siendo hipótesis y no hecho.** **No hay ni un solo IoC que lo pruebe.** Sin
snapshot, sin logs y sin la configuración del servidor, no existe la evidencia que convertiría
esto en conclusión. **Confianza alta no es certeza**, y la distinción no es formalismo: si mañana
apareciera evidencia de otra vía, nada de lo dicho aquí la contradiría.

### Alternativas plausibles, no descartadas

Ninguna de estas requiere **ningún CVE**. Estaban abiertas en el código auditado y un atacante con
un navegador podía usarlas:

- **F1-01** — `POST /api/participants` **escribe en la base de datos sin autenticación**, tomando
  `userId` del body.
- **F1-03** — el rate limiting es **inoperante** (~166 req/s, evadible falsificando
  `x-forwarded-for`, almacén en memoria): el login queda **abierto a fuerza bruta**.
- **F3-01** — cadena completa de **exfiltración de PII sin autenticación**, verificada extremo a
  extremo.
- **F4-01** — la rama de modo `rut` permite **escritura sin autenticar** sobre fichas de
  participantes.

**Ninguna de las cuatro otorga ejecución de código en el servidor**, que es lo que el atacante
demostró tener. Explicarían un robo de datos o una manipulación de registros; **no** explican por
sí solas el control de la máquina y la redirección del dominio. Esa asimetría es la razón
principal por la que React2Shell encabeza la lista.

**Se ha eliminado una atenuación** que este informe sostenía hasta hoy: la superficie del handler
de upgrade WebSocket (GHSA-c4j6-fc7j-m34r) figuraba como condicional a que la app corriera con el
servidor Node integrado. **Corría con PM2 + `next start`: la condición se cumplía.** No la eleva a
hipótesis principal —React2Shell la supera en severidad, fecha y explotación en circulación— pero
deja de estar descontada.

### Lo que el código descartó, y no es poco

- **No hay indicios de manipulación del repositorio** (Fase 5): 31 commits de identidades
  confirmadas, 733/733 dependencias resueltas contra `registry.npmjs.org`, 0 hooks de ciclo de
  vida, 251/251 ficheros en modo `100644`. **El código puede reutilizarse en la reconstrucción con
  confianza.** Descarta manipulación **del repositorio**, no implantes en el **servidor
  destruido** — eso es indeterminable para siempre.
- **La redirección de dominio no salió de la configuración de Next versionada** (Fase 6):
  `next.config.js` no declara `redirects()`, y el manifiesto del build lo confirma de forma
  independiente (`beforeFiles: []`, `fallback: []`, una única redirección interna de Next). Vino
  de la capa de servidor — **Nginx, ahora confirmado como presente** — o del proceso comprometido.
- **No hay SQLi ni ejecución de comandos** (Fase 4): los 6 `sequelize.query()` usan
  `replacements` con parámetros nombrados; `child_process`/`exec`/`eval`/`new Function` dan **0
  coincidencias** en `src/`; el `ORDER BY` está cerrado por lista blanca `z.enum`. **Tampoco hay
  XSS**: 0 `dangerouslySetInnerHTML`.
- **El mecanismo de autenticación es sólido** (Fases 2 y 3): firma verificada, `none` no
  aceptable, solo cabecera `Authorization` (sin CSRF por cookies), bcrypt coste 12, rotación real
  de refresh tokens, rutas administrativas cerradas a `[ADMIN]`, **y ningún secreto de respaldo**
  (F1-05). **El fallo está en la aplicación del mecanismo, no en el mecanismo.**

### Alcance real del daño a datos

**No hubo eventos reales con participantes reales antes del compromiso.** F3-01 y F4-01 —los dos
hallazgos más graves del informe— son por tanto **bugs encontrados a tiempo, no exposiciones
consumadas**. Esto **no rebaja su severidad** (la cadena de exfiltración está verificada y
funcionaría el primer día de operación real), pero sí determina que **no hay notificación de
brecha que hacer y no hay lista de rotación de credenciales**: los datos de producción serán
nuevos y el despliegue nuevo genera secretos nuevos por construcción.

## 7.2 Inventario completo de hallazgos

**41 hallazgos = 2 críticos + 9 altos + 17 medios + 9 bajos + 4 informativos/cerrados.**

### Críticos (2)

| ID | Título | Evidencia | Impacto en una línea |
|---|---|---|---|
| **F3-01** | Cadena completa de exfiltración de PII sin autenticación | `api/events/[eventId]/participants/route.ts:11`, `api/participants/[participantId]/route.ts:10`, `.../guests/route.ts:10` | Nombre, correo, teléfono, RUT y acompañantes de un evento entero **partiendo solo de la URL pública** |
| **F1-01** | `POST /api/participants` crea registros sin autenticación | `api/participants/route.ts:7-22` | Cualquiera **escribe en la base de datos**, con `userId` tomado del body |

### Altos (9)

| ID | Título | Evidencia | Impacto en una línea |
|---|---|---|---|
| **F4-01** | El registro público en modo `rut` escribe sin autenticación **ni validación de esquema** | `api/public/events/[slug]/register/route.ts:60-96` | Sobrescribe 12 campos de cualquier participante cuyo `participantId` entregue el `lookup` público |
| **F4-02** | Invitados leídos del body crudo, sin validación y sin tope | `.../register/route.ts:54`, `:214-240` | Inflado ilimitado de la base de datos en una sola petición |
| **F1-02** | `GET /api/accreditations/stats` expone datos sin autenticación | `api/accreditations/stats/route.ts:7-33` | Estadísticas internas accesibles a cualquiera |
| **F1-03** | El rate limiting no protege contra fuerza bruta | `lib/rate-limit.ts:4-7, 10` | ~166 req/s, evadible con `x-forwarded-for` falsificado, almacén en memoria |
| **F1-07** | Dependencias vulnerables | `package.json` | 18 en producción = 4 críticas + 10 altas + 4 moderadas (**matizado**, ver abajo) |
| **F3-02** | El `lookup` público es un oráculo de enumeración por RUT | `api/public/events/[slug]/lookup/route.ts:26-31` | El espacio de RUT chileno es enumerable; alimenta F4-01 |
| **F3-03** | `bcrypt.compareSync` bloquea el bucle de eventos en el login | `services/authService.ts:15` | Con coste 12, unas pocas peticiones de login **congelan el servidor entero** |
| **F6-01** | Cero configuración de despliegue versionada | 0 de 11 artefactos | Habilitó el retraso de 7 meses; hace el despliegue irreproducible |
| **F6-04** | `DB_SSL` no se puede desactivar en producción; certificado sin validar | `lib/sequelize.ts:10, 27` | **Impide arrancar** contra el PostgreSQL local de la reconstrucción |

### Medios (17)

| ID | Título | Evidencia |
|---|---|---|
| **F1-06** | Runtime de Node no fijado — **cerrado por F6-01** | sin `engines` ni `.nvmrc` |
| **F2-03** | Ausencia total de la barrera `server-only` | `lib/jwt.ts`, `lib/sequelize.ts`, `models/*`, `services/*` |
| **F2-04** | `ALLOWED_ORIGIN` no documentada: su ausencia abre CORS en silencio | `middleware/security.ts:3` + `next.config.js:27` |
| **F2-05** | Filtración de detalles internos en respuestas de error | `api/accreditations/stats/route.ts:32` |
| **F3-04** | Enumeración de usuarios por canal temporal | `services/authService.ts:14-18` |
| **F3-05** | Sin bloqueo de cuenta ni backoff tras intentos fallidos | `services/authService.ts:11-18`, `api/auth/login/route.ts:8-11` |
| **F3-06** | `logout` sin autenticar permite revocar tokens ajenos | `api/auth/logout/route.ts:6-14` + `services/authService.ts:128-139` |
| **F3-07** | `/api/health` filtra detalles internos sin autenticación | `api/health/route.ts:10` |
| **F3-08** | Tokens en `localStorage`, sin cookies `httpOnly` | `store/authStore.ts:112` |
| **F4-03** | Ninguna validación de longitud máxima en todo el esquema de entrada | `utils/validators/` — 1 sola `.max()` en 8 ficheros |
| **F4-04** | Paginación sin tope ni saneamiento numérico | `api/events/[eventId]/participants/route.ts:18-19`, `services/participantService.ts:394, 458-461` |
| **F4-05** | Metacaracteres de `LIKE` sin escapar en los filtros de búsqueda | `services/participantService.ts:412-418, 478-481`; `services/eventService.ts:184-186` |
| **F4-06** | `errorHandler` devuelve `error.message` crudo, también sin autenticación | `utils/errors.ts:69-71` |
| **F6-02** | Cabeceras de seguridad emitidas por dos fuentes divergentes | `next.config.js:19-42` + `middleware/security.ts:15-37` |
| **F6-03** | CSP inefectiva (`unsafe-inline` + `unsafe-eval`) y cabeceras contradictorias | `next.config.js:33`, `middleware/security.ts:18` |
| **F6-05** | Plantilla de entorno incompleta y sin validación al arranque | `.example.env` — 10 declaradas vs. 11 leídas |
| **F6-06** | `dotenv.config()` en código de aplicación + `.env` rastreado en repo público | `lib/sequelize.ts:2, 4` |

### Bajos (9)

| ID | Título | Evidencia |
|---|---|---|
| **F2-06** | TLS de base de datos sin validar el certificado (higiene) | `lib/sequelize.ts:27` |
| **F2-07** | Sin validación de variables críticas al arranque | `lib/sequelize.ts:13` (`\|\| ''`), `lib/jwt.ts:4, 6` |
| **F3-09** | La comprobación de revocación en BD **falla abierta** | `middleware/auth.ts:42-49` |
| **F3-10** | Autorización basada en el token, no en la base de datos | `middleware/auth.ts:33-37` |
| **F4-07** | La subida valida el `Content-Type` declarado, no los bytes | `api/uploads/route.ts:31` |
| **F6-07** | `X-Powered-By: Next.js` no desactivado | `next.config.js` (defecto) |
| **F6-08** | `UPLOADS_DIR` apunta por defecto dentro del directorio de despliegue | `utils/uploadsStorage.ts:15-16` |
| **F6-09** | `webpack` y `turbopack` declarados a la vez; el hook de webpack **no se ejecuta** | `next.config.js:6-8, 43-49` |
| **F6-10** | `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL` declarada y nunca leída | `.env`, `.example.env` — 0 usos en `src/` |

### Informativos y cerrados (4)

| ID | Resultado |
|---|---|
| **F1-04** | **Control correcto — pero no era el que protegía la lectura en producción.** `safeFilename` (`utils/uploadsStorage.ts:53-62`) cierra el path traversal en `/api/uploads`, y sigue siendo válido. Ahora bien, el despliegue anterior servía los ficheros por un **symlink dentro de `public/`**, y los estáticos ganan al rewrite de `afterFiles`: **el handler nunca se ejecutaba en el camino de lectura**. La clasificación se mantiene; ver §7.0 y la especificación de reemplazo en §7.4 |
| **F1-05** | **Positivo.** No existe secreto de firma de respaldo; el patrón es `process.env.JWT_SECRET!` |
| **F2-01** | **Informativo.** Material de autenticación en `auth-debug.log`, fichero **nunca rastreado por git** |
| **F2-02** | **Cerrado.** No hay filtración de secretos al bundle de cliente |

### Matización obligatoria de F1-07 — verificar el uso real antes de planificar

`npm audit` mide **dependencias declaradas, no alcanzabilidad**. Contrastar cada advisory con el
uso real desmontó cuatro alarmas y **redujo el trabajo de remediación**:

| Paquete | Alarma | Realidad verificada |
|---|---|---|
| `jspdf` + `jspdf-autotable` | **crítica** | **0 usos.** → **Eliminar**, no actualizar (evita el cambio incompatible a `jspdf@4`) |
| `dompurify` | moderada | **0 usos.** → **Eliminar** |
| `xlsx` | alta, **sin parche** | Corre **solo en el navegador**. Los endpoints `*/import` reciben JSON ya mapeado, con `withAuth([ADMIN, OPERATOR])`. **No procesa ficheros subidos en el servidor** |
| `sequelize` GHSA-6457-6jrx-69cr | alta | **No alcanzable**: las 4 columnas JSON/JSONB solo se escriben, ninguna se usa en un `where` |
| `next-auth`, `express-rate-limit` | — | **Dependencias muertas.** El limitador activo es `rate-limiter-flexible` |

**La lección, y aplica a cualquier auditoría futura: contrastar siempre el advisory con el uso
real antes de planificar la corrección.** `jws` (alta, verificación de firma HMAC, transitiva de
`jsonwebtoken`) **sí** toca autenticación y **sí** debe actualizarse.

## 7.3 Plan de remediación priorizado

Cada elemento lleva corrección concreta, esfuerzo estimado y dependencias. Los esfuerzos son de
implementación **más su verificación**; no incluyen la regresión general.

### Bloque A — bloquea el redespliegue

**Nada vuelve a producción sin esto.**

| # | ID | Corrección concreta | Esfuerzo | Dependencias |
|---|---|---|---|---|
| **A1** | **F3-01** | ~~`withAuth([ADMIN, OPERATOR, GUARD])`~~ **Lista rectificada al ejecutar — ver la ficha F3-01 y §7.0, séptima corrección.** Padrón del evento: `[ADMIN, MANAGER, OPERATOR, GUARD]`; ficha del participante y sus acompañantes: `[ADMIN, MANAGER, OPERATOR]`. **Sin aislamiento por ámbito** — el personal puede ver todos los eventos (decisión de producto), así que la corrección se limita a exigir auth | ~1 h | Ninguna |
| **A2** | **F1-01** | `withAuth` en `POST /api/participants` y **dejar de leer `userId` del body**: derivarlo del token | ~30 min | Ninguna |
| **A3** | **F4-01** | **Cerrar el camino de escritura, no asegurarlo.** Si el `participantId` corresponde a un participante **ya inscrito**, **rechazar** (409) y devolver el mensaje de contacto — sin actualizar ningún campo. Si no está inscrito: `safeParse` **obligatorio** y lista blanca de campos sobrescribibles | ~3 h | **Decisión de producto P2, ya tomada.** Incorpora la implementación de `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL` |
| **A4** | **F4-02** | Leer los invitados de `validation.data`, no del body crudo; **tope** por `allowedGuests` y por cupo del evento | ~1 h | **Mismo fichero que A3 — hacer en la misma sesión** |
| **A5** | **F1-02** | `withAuth` en `/api/accreditations/stats` | ~15 min | Ninguna |
| **A6** | **F1-03** | Limitador con **almacén compartido** (Redis o tabla), y **confiar en `x-forwarded-for` solo desde Nginx** — configurar el proxy para que lo reescriba y la app para que no acepte el valor del cliente. Umbrales estrictos en `/api/auth/*` | ~3 h | **Depende de la topología ahora conocida** (Nginx delante). Sin ese dato, la corrección habría sido incorrecta |
| **A7** | — | **Next.js a 16.0.7 como mínimo**; preferible la **última estable de la rama 16**. Actualizar también `jsonwebtoken` para arrastrar `jws` parcheado | ~1 h + regresión | **Hacer primero**: todo lo demás se prueba sobre la versión nueva |
| **A8** | **F6-04** | `DB_SSL` como **única** fuente de decisión (quitar el `\|\| NODE_ENV === 'production'`). `rejectUnauthorized: true` + CA en cuanto la conexión salga de la máquina | ~15 min | **Bloquea el arranque** de la reconstrucción si no se hace |
| **A9** | **F1-07** | **Eliminar** `jspdf`, `jspdf-autotable`, `dompurify`, `@types/dompurify`, `@types/jspdf`, `next-auth`, `express-rate-limit` — todas sin uso real | ~30 min | Tras A7, para no re-resolver el árbol dos veces |
| **A10** | **F6-05 / F2-07** | `.example.env` con las **11** variables reales (incluidas `ALLOWED_ORIGIN` y `DB_SSL`) + **validación de entorno al arranque** que **aborte** si falta alguna crítica | ~2 h | — |
| **A11** | **F6-06** | `git rm --cached .env` y retirar `dotenv.config()` del código de aplicación | ~15 min | — |

**Adiciones al mínimo indicado, con su justificación:** **A10** y **A11** no estaban en la lista
mínima. Se suben al Bloque A porque el riesgo que cubren **se materializa en el momento del
despliegue nuevo**, no después: A10 evita que la reconstrucción herede en silencio los valores
permisivos de CORS y SSL (es la contramedida directa de F2-04 y F6-04), y A11 evita que un
despliegue por `git clone` arrastre el `.env` de desarrollo. Ambas son baratas y hacerlas después
significa hacerlas sobre un sistema ya en producción.

**Esfuerzo total del Bloque A: ~12 h más regresión.**

### Bloque B — primera semana tras el redespliegue

| ID | Corrección concreta | Esfuerzo |
|---|---|---|
| **F3-03** | `bcrypt.compare` asíncrono en lugar de `compareSync` — `User.ts:65` ya expone el método correcto. **Corrección de una línea con impacto de DoS: el primero del bloque** | ~10 min |
| **F4-07** | **Promovido desde el Bloque C** (ver justificación bajo la tabla). Validar los **bytes mágicos** del fichero contra la extensión declarada, en `api/uploads/route.ts:31` | ~2 h |
| **F3-02** | Rate limiting por RUT en el `lookup`, y respuesta uniforme que no distinga "existe" de "no existe" | ~2 h |
| **F3-05** | Bloqueo de cuenta y backoff exponencial tras intentos fallidos | ~3 h |
| **F3-04** | Igualar el coste temporal del login exista o no el usuario | ~1 h |
| **F3-06** | Exigir autenticación en `logout` y validar que el token revocado es del solicitante | ~1 h |
| **F3-07** | `/api/health` devuelve solo un estado; los detalles, tras autenticación | ~30 min |
| **F3-08 + F2-04** | **Se corrigen juntas o en este orden, nunca F3-08 sola** — ver dependencias | ~6 h |
| **F2-03** | `server-only` en `lib/jwt.ts`, `lib/sequelize.ts`, `models/*`, `services/*` | ~2 h |
| **F2-05 + F4-06** | `errorHandler` deja de devolver `error.message` crudo; mensaje genérico fuera, detalle al log | ~2 h |
| **F4-04** | Tope duro de `limit` y saneamiento numérico (`limit=abc` → `NaN` hoy atraviesa el default) | ~1 h |
| **F4-03** | `.max()` en los 8 ficheros de `utils/validators/` | ~3 h |
| **F4-05** | Escapar `%` y `_` en los filtros `LIKE` | ~1 h |
| **F6-02** | Una sola fuente de verdad para las cabeceras (**SB-02**) | ~2 h |
| **F6-03** | Retirar `X-XSS-Protection`, resolver el conflicto `X-Frame-Options`/`frame-ancestors`, acotar `img-src`. La CSP con nonces va al Bloque C (**SB-03**) | ~1 h |

> **Por qué F4-07 sube de bloque, y por qué a B y no a A.** La especificación de §7.4 saca la
> lectura de ficheros de la aplicación: los sirve Nginx. Eso convierte la validación **en el
> momento de la subida** en **el único control que la aplicación ejerce sobre estos ficheros** —
> ya no hay una segunda oportunidad en la lectura. Y nunca la hubo realmente: el symlink del
> despliegue anterior ya dejaba el handler fuera del camino (§7.0, quinta corrección), así que
> este hallazgo llevaba clasificado como bajo apoyándose en una red que **no estaba puesta**.
>
> **No sube hasta el Bloque A** porque el riesgo residual concreto sí queda cubierto en la nueva
> configuración: con la **lista blanca de extensiones** y **`nosniff`** de Nginx, un fichero cuyo
> contenido no corresponda a su extensión se sirve como imagen y el navegador **no lo reinterpreta**
> — que era el vector de XSS almacenado. Queda el problema de **almacenar** contenido que no es lo
> que dice ser, que es real pero no bloquea un redespliegue. **Si se decide desplegar sin la
> configuración de Nginx de §7.4, F4-07 pasa al Bloque A**: sin lista blanca ni `nosniff`, deja de
> haber ningún control en ninguno de los dos extremos.

**Esfuerzo total del Bloque B: ~27 h.**

### Bloque C — deuda de seguridad → `SECURITY-BACKLOG.md`

`F3-09` (revocación que falla abierta), `F3-10` (autorización desde el token, no desde la BD),
`F2-06` (validar el certificado de la BD si se externaliza), `F6-07` (`poweredByHeader: false`),
**SB-02** (unificar cabeceras), **SB-03** (CSP con nonces), **SB-04** (decidir bundler).

**Salió de este bloque:** `F4-07`, promovido al Bloque B por la especificación de §7.4.

### Dependencias y acoplamientos — leer antes de repartir el trabajo

1. **F3-08 y F2-04 se corrigen juntas o en orden — nunca F3-08 sola.** Migrar los tokens de
   `localStorage` a cookies `httpOnly` (F3-08) **activa** la explotabilidad del CORS reflejado
   (F2-04): hoy ese CORS es inofensivo **precisamente porque** no hay cookies. Corregir F3-08
   aislada **convierte un hallazgo inofensivo en uno explotable**. Retirar el respaldo `'*'` y
   exigir `ALLOWED_ORIGIN` **antes** o en el mismo cambio.
2. **A3 y A4 tocan el mismo fichero** (`register/route.ts`) — en la misma sesión.
3. **A7 va primero.** Actualizar Next antes que todo lo demás; el resto se verifica sobre la
   versión nueva y no hay que probar dos veces.
4. **A6 depende de la topología**, ahora conocida: con Nginx delante, `x-forwarded-for` debe
   venir del proxy y la aplicación no debe aceptar el del cliente. Sin ese dato la corrección
   habría quedado mal.
5. **A8 bloquea el arranque**, no solo la seguridad: sin ella la aplicación no conecta con el
   PostgreSQL local de la reconstrucción.

## 7.4 Especificación para la reconstrucción

Consolida la §7 de la Fase 6. Es el puente hacia el runbook de endurecimiento del droplet.

### Debe quedar versionado en el repositorio

| Qué | Por qué | Cierra |
|---|---|---|
| **`engines.node`** en `package.json` + **`.nvmrc`** con la misma versión | Fija el tiempo de ejecución; hoy no consta con qué Node corría | F6-01, F1-06 |
| **Dependabot o Renovate** (basta `.github/dependabot.yml`) | **La medida de mayor impacto de todo el informe.** Es lo que habría avisado del salto 16.0.6 → 16.0.7 en diciembre de 2025 y habría cerrado la ventana de siete meses | F6-01 |
| **Unidad systemd**: `User=` sin privilegios, `ProtectSystem=strict`, `PrivateTmp=`, `NoNewPrivileges=`, `ReadWritePaths=` sobre el `UPLOADS_DIR` absoluto, `EnvironmentFile=` con permisos `600` | Hace reproducible el proceso y **documenta** el endurecimiento | F6-01, F6-08 |
| **Configuración de Nginx**: `proxy_pass` a `127.0.0.1`, terminación TLS, `server_name` explícito y `default_server` que **rechace hosts desconocidos**, reescritura de `X-Forwarded-For` | **Es la capa donde probablemente se materializó la redirección.** Versionarla convierte un cambio no autorizado en un `git diff` | F6-01, A6 |
| **`.example.env` completo**: las 11 variables, con `ALLOWED_ORIGIN`, `DB_SSL` y **`UPLOADS_DIR` con la ruta absoluta como valor de ejemplo**, y `NEXT_PUBLIC_MODIFY_CONTACT_EMAIL` **ya implementada** (A3) | La plantilla omite justamente las que gobiernan políticas de seguridad. **Precisión:** `UPLOADS_DIR` **sí figura ya** en `.example.env`, pero **sin valor** — lo que falta no es la variable, es la ruta documentada; se trata igual que las otras dos porque el efecto práctico es el mismo | F6-05, F6-08, F6-10 |
| **Validación de entorno al arranque** (esquema Zod importado por el arranque, que **aborte**) | Un fallo de configuración debe ser ruidoso e inmediato, no silencioso y diferido | F6-05, F2-07 |
| **`poweredByHeader: false`** y una sola fuente de cabeceras | Elimina la divergencia de F6-02 y la huella gratuita de F6-07 | F6-02, F6-07 |
| **Ficheros subidos: escritura por `UPLOADS_DIR`, lectura por Nginx** — ruta externa persistente, p. ej. `/var/lib/tuacreditacion/uploads` | Especificación completa y justificada **justo debajo**. Sustituye cualquier indicación anterior de este informe sobre ficheros subidos | F6-08, F4-07 |
| **`output: 'standalone'`** — **trasladado al runbook**, recomendado pero **no cerrado** | Se decide **con la unidad systemd y el script de despliegue delante**, porque cambia el layout del árbol desplegado | — |

### Ficheros subidos — especificación completa

**Sustituye cualquier indicación anterior de este informe sobre ficheros subidos.**

**Punto de partida, y es un dato del despliegue anterior, no una hipótesis:** las imágenes se
servían mediante un **enlace simbólico dentro de `public/`** apuntando a una carpeta externa del
servidor — fue la forma en que se consiguió mostrarlas en los templates. Eso **confirma
empíricamente** lo deducido en la Fase 6 §3: como el rewrite `/uploads/:file` →
`/api/uploads/:file` está en **`afterFiles`** (`next.config.js:14-16`) y `afterFiles` se evalúa
**después** de comprobar ficheros estáticos, **Next servía los ficheros directamente y el handler
`api/uploads/[filename]/route.ts` nunca entraba en el camino de lectura** — ni con él
`safeFilename`. El control existía, era correcto, y **no estaba puesto donde se creía**.

**Escritura.** `UPLOADS_DIR` apunta a la ruta externa persistente. `api/uploads/route.ts:46,50`
ya escribe donde diga esa variable: **no hay que tocar código, solo configurarla.**

**Lectura.** La sirve **Nginx**, con `alias`, lista blanca explícita de extensiones y `nosniff`:

```nginx
location /uploads/ {
    alias /var/lib/tuacreditacion/uploads/;
    add_header X-Content-Type-Options "nosniff" always;
    location ~* \.(jpg|jpeg|png|webp)$ { }
    location ~ { return 404; }
}
```

**Justificación, elemento por elemento:**

| Elemento | Por qué |
|---|---|
| **Ruta externa persistente** | Los ficheros sobreviven a cada redespliegue. **Crítico si se adopta `output: 'standalone'`** (P1), que reconstruye la carpeta desde cero. Elimina además la necesidad de recrear enlaces en cada despliegue — el mantenimiento manual que motivó el symlink original |
| **Servido por Nginx, no por Node** | No consume el proceso de la aplicación. Importa cuando un template carga muchas imágenes a la vez |
| **Lista blanca de extensiones explícita** | Hoy el control de qué se sirve es **implícito**; aquí queda **declarado y auditable**. El `return 404` del bloque final hace que lo no permitido no se sirva, en vez de depender de que nadie suba otra cosa |
| **`X-Content-Type-Options: nosniff`** | Cierra el vector de un **SVG o un HTML servidos con el tipo equivocado**, que sería **XSS almacenado**. Es, literalmente, **la defensa que sustituye a la que no estaba operando** |
| **Ni symlink en `public/` ni servido por Node** | El symlink es exactamente lo que dejó el handler validado fuera del camino de lectura. **No se reintroduce.** Servirlo por Node lo devolvería al camino, pero a costa del proceso de la aplicación y sin ganar nada que Nginx no dé mejor |

> **Consecuencia para el plan de remediación, y no es menor:** con la lectura fuera de la
> aplicación, **la validación en el momento de la subida pasa a ser el único control que la
> aplicación ejerce sobre estos ficheros.** Ya no hay segunda oportunidad. Por eso **F4-07 sube
> de bloque** — ver §7.3.

**Regla de mantenimiento — la lista blanca de Nginx y `EXT_MIME` se mueven juntas.** Las cuatro
extensiones del bloque anterior son **exactamente** las de `EXT_MIME` en
`src/utils/uploadsStorage.ts:22-27` (`png`, `jpg`, `jpeg`, `webp`), que son las únicas que el
endpoint de subida puede generar. **Si `EXT_MIME` cambia, esta lista cambia con ella.**

Divergir por el lado permisivo no es inocuo, y esta es la razón por la que la regla se escribe
aquí en vez de dejarse al criterio de quien redacte la configuración: **Nginx serviría ficheros
que la aplicación nunca produce**, y que un fichero así exista en `UPLOADS_DIR` solo puede
significar que algo lo colocó ahí por una vía distinta al endpoint de subida. Ajustada al
conjunto real, la lista blanca deja de ser únicamente un control y pasa a ser también un
**detector**: lo que no encaja, no se sirve.

> **Corregido el 2026-07-27.** La versión anterior de este bloque admitía seis extensiones —`gif`
> y `pdf` incluidas—, que **no provenían del código** sino de una plantilla genérica, y remitía a
> `utils/uploadsStorage.ts:44-49`, una ubicación que no existe. Ambas cosas quedan rectificadas
> contra la fuente: `EXT_MIME` está en `src/utils/uploadsStorage.ts:22-27` y tiene cuatro entradas.

### Controles para que la ventana de siete meses no se repita

Este es el punto que más importa: el vector más probable no entró por un fallo de diseño, sino
porque **nadie se enteró de que había un parche**.

1. **Dependabot o Renovate**, con alertas que lleguen a una persona.
2. **`npm audit` en CI**, fallando el build por severidad alta o superior.
3. **Un umbral escrito**: los parches de severidad crítica se aplican en días, no en meses.
4. **Revisión trimestral de dependencias muertas** — este informe encontró cuatro (`next-auth`,
   `express-rate-limit`, `jspdf`, `dompurify`) que solo aportaban superficie de ataque.

### Fuera del repositorio — va al runbook, no al árbol de fuentes

Doble cortafuegos (Cloud Firewall + UFW), PostgreSQL escuchando solo en localhost o socket Unix
con usuario **sin `SUPERUSER`**, Certbot, backups cifrados fuera de la máquina con restic,
auditd/AIDE, y checklist de verificación posterior a la instalación.

**Se mantiene la recomendación de no usar Docker:** publica puertos **saltándose UFW**, que es
exactamente el modo de fallo que esta reconstrucción debe evitar.

## 7.5 Qué no pudo determinarse — lista cerrada

Estas líneas **no quedaron pendientes por descuido**. Son indeterminables, y en su mayoría lo son
**de forma permanente**. Se cierran aquí para que nadie las reabra creyendo lo contrario.

| Qué | Por qué es indeterminable |
|---|---|
| **El vector real, con certeza** | Sin snapshot, sin logs del sistema y sin la configuración del servidor, **no hay ni un IoC**. React2Shell es la hipótesis mejor sostenida, no un hecho probado |
| **Si hubo implante o persistencia en el droplet** | La Fase 5 descarta manipulación **del repositorio** con evidencia sólida. **No dice nada del servidor destruido**, y nada podrá decirlo |
| **El cambio concreto que produjo la redirección** | Se sabe que **no** salió de la configuración de Next versionada, y que **había Nginx delante**. Cuál fue la edición exacta —Nginx, DNS en DonWeb, o el proceso comprometido— murió con la máquina |
| **Si la configuración de Nginx se editó a mano** | Nunca estuvo versionada (F6-01); no hay línea base contra la que comparar |
| **Si el vector fue el sistema operativo** (nginx, OpenSSL, kernel sin actualizar) | Fuera del alcance del código. Requeriría el estado de paquetes de la máquina |
| **Si se robó una clave SSH de otra máquina** | Fuera del alcance del repositorio |
| **Si el atacante entró por un servicio abierto a mano tras el despliegue** | Fuera del alcance del repositorio |
| **Si hubo phishing de credenciales** | Fuera del alcance del repositorio |

**Cerradas durante esta auditoría, y por tanto ya no en esta lista:** el modo de arranque real
(P3: PM2 + `next start` + Nginx), el bundler del build (Turbopack, verificado en el manifiesto),
y si el modo `rut` llegó a usarse con datos reales (**no hubo eventos reales**, luego F4-01 y
F3-01 no llegaron a explotarse).

---

## Fases pendientes

- [x] Fase 1 — Versión y CVEs conocidos
- [x] Fase 2 — Manejo de secretos
- [x] Fase 3 — Superficie expuesta y autenticación
- [x] Fase 4 — Inyección y validación de entrada
- [x] Fase 5 — Integridad del código
- [x] Fase 6 — Configuración de despliegue en el repo
- [x] Fase 7 — Reporte y plan de remediación

**Auditoría completa.** Siguiente paso: **remediación en sesión aparte** (Bloque A), y después la
reconstrucción del droplet con la especificación de §7.4.
