# PROJECT_CONTEXT.md

> Documento de contexto generado tras un análisis completo del proyecto.
> Resume la arquitectura, tecnologías, estructura, ejecución, funcionalidades y partes incompletas.
> **No describe cambios realizados** — es solo un mapa del estado actual del código.

---

## 1. Resumen general

**`acreditacion_prueba2`** es una aplicación web **full-stack** para la **gestión y acreditación de eventos**. Permite crear eventos con horarios (schedules), registrar participantes (manual, importación o formulario público), gestionar invitados (guests), realizar la **acreditación / check-in** en el acceso, asignar y entregar premios (awards), y generar reportes/estadísticas.

Está construida íntegramente sobre **Next.js (App Router)**, usando el mismo proyecto tanto para el **frontend (React)** como para el **backend (API Routes + servicios + ORM)**.

El idioma del dominio es mixto: el código y los comentarios están mayormente en inglés, pero hay terminología de negocio en español (roles como `GUARDIA`, campos como `numeroSap`, `opcionesAlimentaria`, etc.).

---

## 2. Tecnologías utilizadas

### Núcleo
- **Next.js `^16.0.5`** (App Router, con Turbopack) — framework full-stack.
- **React `^19.2.0`** + **React DOM `^19.2.0`**.
- **TypeScript `^5.9.3`** (modo `strict`).
- **Node.js** (API Routes server-side).

### Base de datos / ORM
- **MySQL** (driver **`mysql2`**).
- **Sequelize `^6.37.7`** (+ `sequelize-typescript`, aunque los modelos usan la API clásica `Model.init()`).
- Modelos con `paranoid: true` (soft-delete) y `underscored: true` (columnas en snake_case).

### Autenticación y seguridad
- **JWT** (`jsonwebtoken`, `jwt-decode`) — access token + refresh token.
- **bcryptjs** — hashing de contraseñas.
- **next-auth `^4.24.13`** está como dependencia (uso real limitado; la auth principal es JWT propia).
- **helmet**, **cors** — cabeceras de seguridad.
- **express-rate-limit** + **rate-limiter-flexible** + **lru-cache** — rate limiting.
- **dompurify** — sanitización de HTML.
- **zod `^4.1.13`** — validación de esquemas (cliente y servidor).

### Frontend / UI
- **Tailwind CSS `^4.1.17`** (+ `@tailwindcss/postcss`, `tailwind-merge`, `tailwind-variants`).
- **@headlessui/react**, **@radix-ui/react-slot**, **lucide-react** (iconos).
- **react-hook-form** + **@hookform/resolvers** (formularios con validación zod).
- **zustand `^5.0.8`** — gestión de estado global.
- **recharts** — gráficas de reportes.
- **react-hot-toast** — notificaciones.
- **react-datepicker**, **react-dropzone**, **react-table**, **react-transition-group**.

### Datos / Importación / Exportación
- **papaparse**, **xlsx** — CSV/Excel.
- **jspdf** + **jspdf-autotable** — generación de PDF.
- **csv-stringify**, **date-fns**, **lodash**, **uuid**.

### Testing
- **Jest `^30`** + **ts-jest** + **supertest** + **sequelize-mock**.
- Umbral de cobertura configurado al **80%** (branches/functions/lines/statements).

---

## 3. Arquitectura

La aplicación sigue una arquitectura **en capas dentro de Next.js App Router**:

```
Navegador (React Client Components, Zustand stores)
      │  fetch vía src/utils/apiClient.ts (inyecta Bearer token, auto-refresh)
      ▼
API Routes  (src/app/api/**/route.ts)
      │  withAuth() → roleGuard (verifica JWT + rol)
      ▼
Services    (src/services/*.ts)  ← lógica de negocio, transacciones, audit log
      ▼
Models      (src/models/*.ts)    ← Sequelize ORM
      ▼
MySQL
```

### Capas
- **Páginas / Componentes (`src/app`, `src/components`)**: UI con React. Mezcla de Server y Client Components.
- **Estado (`src/store`)**: stores de Zustand por dominio (auth, events, participants, accreditation, awards, guests, ui).
- **Cliente API (`src/utils/apiClient.ts`)**: wrapper de `fetch` con inyección automática del token, refresh automático ante 401, manejo de errores tipados y reintentos.
- **API Routes (`src/app/api`)**: endpoints REST. Cada uno protegido con `withAuth(handler, [roles])`.
- **Middleware global (`src/middleware.ts`)**: aplica **rate limiting** + **cabeceras de seguridad/CORS** a todas las rutas `/api/*`.
- **Middleware de auth (`src/middleware/auth.ts`)**: HOF `withAuth` que valida el JWT (`Authorization: Bearer`) y el rol antes de ejecutar el handler.
- **Servicios (`src/services`)**: lógica de negocio, transacciones Sequelize, bloqueos (`LOCK.UPDATE`), y registro en `auditLogService`.
- **Modelos (`src/models`)**: entidades Sequelize y sus asociaciones (definidas en `src/models/index.ts` para evitar dependencias circulares).
- **Validadores (`src/utils/validators`)**: esquemas Zod por dominio.

### Roles del sistema (`src/utils/constants.ts`)
- `ADMIN`, `MANAGER`, `OPERATOR`, `GUARD` (valor real `'GUARDIA'`).

### Modelo de datos (entidades principales)
- **User** — usuarios del sistema con rol.
- **Event** — evento; soporta capacidad, invitados, y **registro público** (`publicSlug`, `publicTemplate`, `isPublic`, `registrationConfig`).
- **EventSchedule** — horario/sesión dentro de un evento (con estados: `published`, `accrediting`, etc.).
- **Participant** — participante (origen `MANUAL` / `IMPORT` / `PUBLIC_FORM`, preferencias alimentarias, `allowedGuests`).
- **Guest** — invitado asociado a un participante.
- **ParticipantSchedule** — tabla intermedia (Participant ⇄ EventSchedule, relación N:M).
- **Award** / **ParticipantAward** — premios y su asignación/entrega.
- **Accreditation** — registro de check-in/check-out (de participante o invitado en un schedule).
- **RefreshToken** — tokens de refresco persistidos.
- **AuditLog** — registro de auditoría de acciones.

---

## 4. Estructura de carpetas

```
acreditacion_prueba2/
├── .env / .example.env        # Variables de entorno (DB, secretos JWT)
├── package.json               # Dependencias y scripts npm
├── next.config.js             # Config Next: CORS, CSP, headers de seguridad, externals sequelize
├── tsconfig.json              # TS strict + alias @/...
├── jest.config.js / jest.setup.js  # Testing
├── tailwind.config.js / postcss.config.js
├── PROMPTS.md                 # Historial/registro de prompts de desarrollo (~43 KB)
├── TODO.txt                   # Lista de pendientes y errores de tipos conocidos
├── scripts/                   # Scripts standalone (no enganchados a npm)
│   ├── seed-data.ts
│   ├── seed-users.ts
│   └── sync-db.ts
└── src/
    ├── app/                   # App Router (páginas + API)
    │   ├── api/               # ~40 endpoints REST (auth, events, participants,
    │   │                      #   accreditations, awards, guests, reports, public, health)
    │   ├── (páginas)/         # dashboard, events, participants, accreditation, reports, login
    │   ├── public/            # páginas públicas de registro
    │   ├── layout.tsx / page.tsx / globals.css
    ├── components/            # Componentes React por dominio
    │   ├── accreditation/ auth/ awards/ dashboard/ events/
    │   ├── participants/ public/ reports/ layout/ ui/
    ├── hooks/                 # useMobile.ts
    ├── lib/                   # sequelize.ts, db.ts, jwt.ts, rate-limit.ts
    ├── middleware.ts          # middleware global de Next
    ├── middleware/            # auth.ts, security.ts
    ├── models/                # 11 modelos Sequelize + index.ts (asociaciones)
    ├── scripts/               # sync-db.ts (variante dentro de src)
    ├── services/              # lógica de negocio (+ __tests__)
    ├── store/                 # stores Zustand
    ├── types/                 # auth.d.ts, index.ts
    └── utils/                 # apiClient, constants, errors, formatters,
                               #   generateReport, permissions, validators/
```

---

## 5. Cómo se ejecuta la aplicación

### Requisitos previos
1. **Node.js** y **npm** instalados.
2. **MySQL** corriendo y una base de datos creada (por defecto `Acreditacion`, según `.env`).
3. Un archivo `.env` (ya existe uno; ver advertencia de seguridad en la sección 8).

### Variables de entorno (`.env`)
```
DATABASE_URL="mysql://user:password@localhost:3306/accreditation_db"
JWT_SECRET / JWT_REFRESH_SECRET
JWT_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN
NODE_ENV
```

### Scripts npm (`package.json`)
| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo (Next + Turbopack). |
| `npm run build` | Build de producción. |
| `npm run start` | Sirve el build de producción. |
| `npm run lint` | ESLint vía Next. |
| `npm test` | Ejecuta Jest. |
| `npm run test:watch` | Jest en modo watch. |
| `npm run test:coverage` | Jest con cobertura. |

### Inicialización de la base de datos
- La sincronización de tablas se hace con **Sequelize `sync`**:
  - `src/lib/db.ts → initDB()` usa `sync({ alter: true })`.
  - `src/scripts/sync-db.ts` y `scripts/sync-db.ts` usan `sync({ force: true })` (**⚠️ borra y recrea tablas**).
- Hay scripts de **seed** (`scripts/seed-users.ts`, `scripts/seed-data.ts`) para poblar datos.
- ⚠️ **Importante**: estos scripts de `scripts/` y `src/scripts/` **no están enlazados a `package.json`**, por lo que hoy se ejecutan manualmente (p. ej. con `ts-node`/`tsx`); no hay un comando npm documentado para ellos.

---

## 6. Funcionalidades existentes

### Backend (API Routes — ~40 endpoints)
- **Auth**: `login`, `logout`, `register`, `refresh`, `me` (con tests en `__tests__`).
- **Events**: CRUD de eventos, schedules anidados, awards por evento, participantes por evento, estadísticas.
- **Participants**: CRUD, awards y guests por participante.
- **Accreditations**: acreditar participante/invitado, listado, **acreditación masiva (bulk)**, verificación, stats, por schedule. Usa **transacciones con bloqueo** y control de **capacidad** y **duplicados**.
- **Awards / ParticipantAwards**: asignar, entregar (`deliver`), cancelar.
- **Guests**: gestión de invitados.
- **Reports**: dashboard, asistencia, premios, por evento, por schedule, **realtime por evento**, actividad por usuario.
- **Public**: ver evento público por `slug` y **registro público de participantes** (formulario abierto).
- **Health**: `GET /api/health`.

### Frontend (páginas — App Router)
- `/login`, `/dashboard`, `/events`, `/events/new`, `/events/[eventId]` (+ `participants`, `participants/new`, `awards`, `reports`).
- `/participants/[participantId]` (+ `/edit`).
- `/accreditation` — panel principal de acreditación.
- `/reports` — monitoreo global.
- `/public/events/[slug]` — registro público con **plantillas seleccionables** (Default / Modern / Minimal).

### Características transversales
- Autenticación JWT con **refresh automático** del token antes de expirar.
- **Control de acceso por rol** (cliente: `ProtectedRoute`/`RoleGuard`; servidor: `withAuth`).
- **Rate limiting** y **cabeceras de seguridad/CSP** globales.
- **Auditoría** de acciones (`AuditLog` + `auditLogService`).
- Validación con **Zod** en cliente y servidor.
- Importación de participantes (CSV/Excel) y generación de reportes/PDF (parcial — ver sección 7).

---

## 7. Partes incompletas / pendientes

> Detectadas por análisis de código, comentarios y `TODO.txt`.

### Datos simulados (mock) en lugar de datos reales
- ~~`src/components/reports/RealtimeStats.tsx`~~ — **Resuelto**: ahora consulta `/api/reports/realtime/{eventId}` con refresco cada 20s (datos reales, no simulados).
- ~~`src/components/dashboard/DashboardStats.tsx`~~ — **Resuelto**: reescrito con datos reales del panel (sin mock ni recharts).
- ~~`src/components/reports/AwardsSummary.tsx`, `AttendanceTable.tsx`, `ExportButton.tsx`~~ — **Eliminados**: eran maquetas mock sin conectar a nada. La exportación real de asistentes (con preferencia alimenticia) vive en `EventReport.tsx`.
- `src/components/events/ScheduleList.tsx` — `mockSchedules` vacío y el borrado (`deleteSchedule`) está **comentado** (solo hace `console.log`).

### Funcionalidad stub / placeholder
- `src/components/participants/ParticipantDetails.tsx`:
  - `handleAccredit` tiene `eventScheduleId = '...'` **hardcodeado** (falta UI para elegir schedule).
  - Sección de premios muestra **"Awards section coming soon."** (import de `AwardList` comentado).
  - Workaround temporal: lee `accredited` con cast `as any` ("the backend should provide this information").
- Importación/Exportación de participantes: existe `ParticipantImport.tsx` y botones en `ParticipantList`, pero **no están totalmente cableados** a un handler.

### Rutas/páginas ausentes (referenciadas en el Sidebar pero sin `page.tsx`)
- `/settings` (solo ADMIN) — **no existe**.
- `/participants` (listado global) — solo existen detalle/edición.
- `/awards` (listado global) — solo accesible vía `/events/[eventId]/awards`.

### Seguridad / autenticación
- **JWT sin expiración** — `src/lib/jwt.ts` L17: `TODO: Re-add expiration dates`. Los tokens se firman **sin `expiresIn`** (riesgo: tokens que no caducan). Ver sección 8.

### Inconsistencias de tipos / diseño (de `TODO.txt` y comentarios)
- Conflicto **UUID (string) vs number** en IDs en varios puntos (p. ej. `awards/[awardId]/assign/route.ts`, `awardStore.ts`), resuelto con casts `as any`.
- `TODO.txt` enumera errores de tipos en `EventForm`, `ParticipantForm`, resolvers de `react-hook-form`/zod, e imports que en su momento no resolvían (algunos componentes ya existen ahora, por lo que parte de `TODO.txt` puede estar **desactualizada**).
- Dudas de diseño sin resolver (comentarios) en `participantService.ts` sobre creación masiva y si la acreditación es **global o por schedule**.
- Incertidumbre sobre los mixins de asociación de Sequelize en el registro público (`api/public/events/[slug]/register/route.ts`).

### Pendientes funcionales (de `TODO.txt`, requisitos de negocio)
- Heredar la **ubicación** del schedule desde el evento si no tiene una propia.
- Considerar `opcionesAlimentaria`.
- Arreglar el **buscador de eventos** ("search events no está funcionando").
- Marca de **"nuevo"** para saber si un registro ya fue visto.
- Accesos rápidos a eventos de **ayer/hoy/mañana** en la barra superior.
- Mostrar **fecha de inscripción / fecha de acreditación**.
- Homogeneizar el formato de respuesta de la API de `getAllEvents` en todas las rutas.

### Manejo de errores deshabilitado
- `src/lib/db.ts` L36 — `process.exit(1)` está **comentado**: si falla la sincronización de la BD, la app continúa.

### TODO/comentarios de código encontrados
- 1 `TODO` explícito: `src/lib/jwt.ts:17`.
- Bloques de código comentado: `lib/db.ts:36`, `ParticipantDetails.tsx:10`, `participantService.ts:140` (`include` de awards comentado), `ScheduleList.tsx:35`.

---

## 8. Observaciones y riesgos relevantes

> No son tareas a ejecutar; son notas para tener en cuenta antes de modificar nada.

1. **Secretos por defecto y `.env` versionado en el working dir**: el `.env` actual tiene secretos triviales (`"your-super-secret-jwt-key"`) y credenciales de BD locales (`root:12345678`). `.gitignore` sí ignora `.env*`, pero conviene confirmar que no se haya subido históricamente y rotar secretos en producción.
2. **JWT sin caducidad** (sección 7): combinado con el punto anterior, es el riesgo de seguridad más importante.
3. **Dos instancias de Sequelize**: `src/lib/sequelize.ts` (usada por los modelos) y `src/lib/db.ts` (otra instancia independiente con `initDB`). Es una **duplicación** que conviene unificar para evitar conexiones/configuraciones divergentes.
4. **`sync({ force: true })`** en los scripts de sync **borra todas las tablas**; usar con cuidado fuera de desarrollo.
5. **Posible inconsistencia de modelo**: `accreditationService` compara `participant.eventId` / `guestParticipant.eventId` contra `schedule.eventId`, pero el modelo `Participant` **no declara una columna `eventId` ni una relación directa `belongsTo(Event)`** (la relación Participant⇄Event es N:M vía `EventSchedule`/`ParticipantSchedule`). Conviene verificar si esto es un bug latente antes de tocar la acreditación.
6. **`TODO.txt` parcialmente obsoleto**: varias rutas de componentes que figuran como "módulo no encontrado" ya existen en `src/components/`. Tratarlo como referencia histórica, no como verdad actual.

---

## 9. Estado de tests
- Existen tests para servicios (`accreditation`, `auth`, `award`, `event`) y para rutas de auth (`login`, `register`).
- Configuración Jest con cobertura exigida al 80%, pero `collectCoverageFrom` apunta a `src/pages/api/**` (estructura **Pages Router**) cuando el proyecto usa **App Router** (`src/app/api/**`) — por lo que la recolección de cobertura podría no estar capturando los endpoints reales.

---

*Fin del documento.*
