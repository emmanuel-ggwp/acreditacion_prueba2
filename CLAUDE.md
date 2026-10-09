# CLAUDE.md — Guía del repositorio (AcreditaPro)

Guía para desarrolladores y agentes de IA que trabajan en este repositorio. Describe **el estado actual** del código: stack, estructura, cómo ejecutar/probar/desplegar y las convenciones que hay que respetar.

> Para la **referencia de la API** ver [`docs/api-reference.md`](docs/api-reference.md); para la **arquitectura en detalle** ver [`docs/architecture.md`](docs/architecture.md); para el **despliegue** ver [`infra/RUNBOOK.md`](infra/RUNBOOK.md), [`planes/07-reconstruccion-droplet.md`](planes/07-reconstruccion-droplet.md) y [`.example.env`](.example.env).
>
> Nota: `PROJECT_CONTEXT.md` es un snapshot antiguo y está **desactualizado** (dice MySQL, sin migraciones, 3 plantillas). No te fíes de él; esta guía y el código son la fuente de verdad.

## Qué es

**AcreditaPro** (Grupo Lo Castillo) es una aplicación web full-stack para **gestión y acreditación de eventos**: crear eventos con fechas/horarios, precargar o inscribir participantes (manual, importación o formulario público), gestionar invitados, **acreditar/check-in en la puerta**, asignar y entregar premios, gestionar la campaña de **regalos de Navidad**, y generar reportes. Frontend y backend viven en el mismo proyecto Next.js.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript 5** (`strict`).
- **PostgreSQL** (driver `pg`) + **Sequelize 6** (API clásica `Model.init`, `underscored: true`, `paranoid` en varias entidades).
- **Migraciones**: `umzug` (carpeta `migrations/`), NO `sync` en producción.
- **Zod 4** (validación cliente + servidor) · **Zustand 5** (estado global).
- **Auth**: JWT propio (`jsonwebtoken`) — access token + refresh token en cookie HttpOnly · `bcryptjs`.
- **EmailJS** (`@emailjs/browser`) para el correo de confirmación (se envía desde el cliente de la landing).
- **Jest 30** + `ts-jest` para pruebas.

## Comandos

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3000). |
| `npm run build` | Build de producción. Su `postbuild` compila además las migraciones a `dist-migrate/` (runner sin `tsx` para prod). |
| `npm start` | Sirve el build (`next start -H 127.0.0.1`; escucha SOLO en loopback a propósito). |
| `npm run lint` | ESLint. |
| `npm test` | Jest (incluye el gate de cobertura). |
| `npm run test:coverage` | Jest con reporte de cobertura. |
| `npm run db:migrate` | Aplica migraciones pendientes con `tsx` (**desarrollo**). **Esto es lo que crea/actualiza el esquema.** |
| `npm run db:migrate:status` | Estado de migraciones (desarrollo, `tsx`). |
| `npm run db:migrate:prod` | Aplica migraciones con `node` desde `dist-migrate/` (**producción**, SIN `tsx`/`typescript`; requiere `npm run build` antes). |
| `npm run db:migrate:prod:status` | Estado de migraciones en producción (`node`). |
| `npm run migrate:build` | Compila el runner y las migraciones a `dist-migrate/` (`tsc -p tsconfig.migrate.json`); lo invoca `postbuild`. |
| `npm run db:seed` / `db:seed:users` | Datos de ejemplo / usuarios. |
| `npm run db:sync` | ⚠️ `sync` de Sequelize — **destructivo/alterante**, NO usar en producción. Usa migraciones. |

Base local de desarrollo/QA: PostgreSQL embebido en `C:\pgqa` (ver la memoria del proyecto). `.env.local` apunta ahí.

## Estructura

```
src/
├── app/
│   ├── api/**/route.ts     # ~59 rutas REST (88 handlers). Protegidas con withAuth([roles]).
│   ├── (páginas panel)/    # dashboard, events, accreditation, reports, gifts, audit, users, settings, login
│   └── public/events/[slug]/  # landing pública de inscripción (server component + plantillas)
├── components/             # UI por dominio: accreditation, auth, awards, dashboard, events,
│                           #   participants, public (+ public/templates), reports, layout, ui
├── services/               # Lógica de negocio: transacciones, locks, audit log. (+ __tests__)
├── models/                 # 17 modelos Sequelize + index.ts (asociaciones, para evitar ciclos)
├── lib/                    # sequelize.ts, jwt.ts, rate-limit.ts, auth-rate-limit.ts, env.ts
├── middleware/             # auth.ts (withAuth/roleGuard), security.ts (CORS/cabeceras)
├── proxy.ts                # Middleware global de Next 16 (rate limit + seguridad) sobre /api/*
├── store/                  # Zustand por dominio (auth, events, participants, awards, ...)
├── utils/                  # apiClient, constants, formatters, guests, dietary, formFields,
│                           #   customQuestions, color, permissions, errors, validators/ (Zod)
└── types/
migrations/                 # 0001-baseline … 0005-create-guest-schedules (umzug)
scripts/                    # migrate.ts, seed-data.ts, seed-users.ts
docs/                       # api-reference.md, architecture.md, manual (HTML)
infra/                      # RUNBOOK.md, provisión (systemd/nginx), sql/
```

## Arquitectura (capas)

```
React (Client Components + Zustand)
  └─ src/utils/apiClient.ts  (inyecta Bearer, auto-refresh ante 401)
      └─ API Routes  src/app/api/**/route.ts
          └─ withAuth(handler, [roles])   ← valida JWT y el ROL contra la BD
              └─ Services  src/services/*.ts   ← negocio, transacciones, audit
                  └─ Models  src/models/*.ts   ← Sequelize
                      └─ PostgreSQL
```

- **`withAuth`** (`src/middleware/auth.ts`): verifica el access token y luego **contrasta vigencia y rol contra la BD** (fuente de verdad, no el token) en cada petición. Degradar o revocar un rol surte efecto en la siguiente petición.
- **`proxy.ts`**: rate limiting global (600/min por usuario, 120/min por IP anónima) + cabeceras de seguridad sobre `/api/*`. El límite estricto de credenciales (almacén PostgreSQL) cubre `/api/auth/login`; el registro público tiene sus propios cubos.
- **CORS**: fuente única en `src/middleware/security.ts` (lee `ALLOWED_ORIGIN`). No configurar CORS en `next.config.js` (se congela en el build).

## Roles (`src/utils/constants.ts`)

`ADMIN` (Administrador) · `MANAGER` (Gerente) · `OPERATOR` (Operador) · `GUARD` = `'GUARDIA'` (Acreditador Eventos). Cada ruta declara sus roles permitidos en su `withAuth([...])`; ver la referencia de la API para el mapa completo.

## Modelo de datos (entidades clave)

- **Event** → 1-N **EventSchedule** (fechas del evento; `maxCapacity`, `maxAttendees`, `blockType`, estado `published`/`accrediting`/`accredited`). Registro público: `isPublic`, `publicSlug`, `publicTemplate`, `registrationOpen`, `registrationConfig` (tema, modo de invitados, campos, preguntas).
- **Participant** ⇄ **EventSchedule** N:M vía **ParticipantSchedule** (inscripción por fecha; un participante "precargado" no tiene fechas hasta que se inscribe).
- **Guest** pertenece a un Participant; **Guest** ⇄ **EventSchedule** N:M vía **GuestSchedule** → *invitados distintos por fecha*. Un invitado sin GuestSchedule vale para cualquier fecha (retrocompatibilidad).
- **Accreditation**: check-in por par (persona, `eventScheduleId`); un registro por persona y fecha.
- **Award** / **ParticipantAward**: premios con control de stock (asignar/entregar/cancelar).
- **Gift\***: campaña de regalos — `GiftCampaign` → `GiftType` / `GiftEmployee` → `GiftDelivery`.
- **User**, **RefreshToken**, **AuditLog**, **EmailTemplate**.

Soft-delete (`paranoid`) en Event, Participant, Guest, User, EmailTemplate. **NO** en ParticipantSchedule, GuestSchedule ni Accreditation (se borran de verdad).

Modos de invitados (`getGuestMode` en `src/utils/formFields.ts`): `named` (filas Guest), `count` (número), `companion` (sí/no + nº de cargas; el máximo aplica a las **cargas**, el acompañante es +1 extra).

## Convenciones importantes

- **Fechas en la cara pública**: usar siempre `formatDateCL` / `formatTimeCL` / `formatDateTimeCL` de `src/utils/formatters.ts` (fuerzan `es-CL` + `America/Santiago`). Nunca `toLocale*` suelto: rompe la hidratación SSR/cliente y muestra la hora del navegador.
- **Esquema de BD**: siempre por **migraciones** (`migrations/`, `npm run db:migrate`). Nunca `db:sync` en producción.
- **Entorno**: `src/lib/env.ts` valida al arrancar y **aborta** si falta algo obligatorio en producción (secretos ≥32 chars, `ALLOWED_ORIGIN`, `UPLOADS_DIR`, SSL de BD, etc.). En dev es laxo. Toda variable que la app lee está documentada en `.example.env`.
- **`NEXT_PUBLIC_*`** se **inlinean en el build**: cambiarlas exige recompilar y redesplegar.

## Pruebas

- **Infra de mocks** (`jest.setup.js`): mockea GLOBALMENTE todos los modelos Sequelize y `@/lib/sequelize`. En los tests **no** se hace `jest.mock('@/models/...')`: se importa el modelo y se castea `as jest.Mocked<typeof X>`.
- **Tests de servicios**: configurar los estáticos del modelo (`findByPk`, `create`, …) y, para transacciones, mockear `sequelize.transaction` (soportando `transaction()`, `transaction(cb)` y `transaction(opts, cb)`). Los métodos de instancia (`update`, `get({plain:true})`, `destroy`) se añaden como `jest.fn()` en el objeto devuelto por el mock.
- **Tests de rutas**: factory-mock del servicio, mock de `@/lib/jwt` (`verifyAccessToken`) + `User.findByPk` para `withAuth`, y factory-mock de los módulos de rate-limit (para no cargar `jose`, que es ESM). Referencias: `src/app/api/auth/login|register/__tests__/route.test.ts`.
- **Cobertura**: umbral tipo *ratchet* en `jest.config.js` (algo por debajo de lo real, ~90% líneas). Se sube al añadir pruebas; no bajarlo.
- Ejecutar todo con `npx jest` (los directorios `[bracket]` de rutas dinámicas rompen si se pasan como argumento suelto; el run completo los descubre bien).

## Despliegue (resumen)

Servidor: droplet DigitalOcean + Nginx + systemd, BD **PostgreSQL administrada** de DigitalOcean (requiere `DB_SSL=true` + `DB_CA_CERT`). Flujo: `git pull` → `npm ci` → cargar entorno de prod y `npm run build` → `npm run db:migrate:prod` → reiniciar el servicio. En prod las migraciones corren con `node` desde `dist-migrate/` (que genera el `postbuild`), porque `tsx`/`typescript` son devDependencies y no están instalados; `npm run db:migrate` (con `tsx`) es solo para desarrollo. El detalle y las precondiciones están en `infra/RUNBOOK.md`, `planes/07-reconstruccion-droplet.md` y `planes/08-precondiciones-despliegue.md`.
