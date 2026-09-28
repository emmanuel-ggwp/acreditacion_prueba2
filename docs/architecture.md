# Arquitectura — AcreditaPro

Documento de arquitectura: cómo encajan las piezas y por qué. Para la guía rápida ver [`../CLAUDE.md`](../CLAUDE.md); para los endpoints ver [`api-reference.md`](api-reference.md).

## 1. Visión en capas

Todo (frontend y backend) vive en un único proyecto Next.js 16 (App Router). No hay backend separado.

```
┌─────────────────────────────────────────────────────────────┐
│  Navegador — React 19 Client Components + stores Zustand      │
│  src/utils/apiClient.ts: inyecta el Bearer y auto-refresca    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS (Nginx → next start en 127.0.0.1)
┌───────────────────────────▼─────────────────────────────────┐
│  proxy.ts (middleware global Next): rate limit + cabeceras    │
│  API Routes  src/app/api/**/route.ts                          │
│    withAuth(handler, [roles])  → verifica JWT + rol EN LA BD   │
│      Services  src/services/*.ts  → negocio, transacciones     │
│        Models  src/models/*.ts    → Sequelize                  │
│          PostgreSQL (administrada, DigitalOcean, SSL+CA)       │
└─────────────────────────────────────────────────────────────┘
```

**Responsabilidades por capa**

- **Páginas/componentes** (`src/app`, `src/components`): UI. Server Components para lo que lee la BD directo (p. ej. la landing pública `public/events/[slug]/page.tsx`), Client Components para lo interactivo.
- **Cliente API** (`src/utils/apiClient.ts`): envuelve `fetch`, adjunta el access token, y ante un 401 pide un token nuevo con la cookie de refresh y reintenta.
- **API Routes**: endpoints REST. Cada uno se protege con `withAuth([roles])`. La validación de entrada usa esquemas Zod (`src/utils/validators`), a veces en el handler y a veces dentro del servicio.
- **Servicios**: la lógica de negocio real. Aquí viven las transacciones Sequelize, los bloqueos de fila (`LOCK.UPDATE`) para serializar (acreditación, stock de premios) y el registro de auditoría (`auditLogService`).
- **Modelos**: entidades Sequelize. Las **asociaciones se declaran en `src/models/index.ts`** para evitar dependencias circulares.

## 2. Autenticación y ciclo de la petición

- **Login**: `authService.login` valida credenciales (bcrypt), emite un **access token** (JWT corto) y un **refresh token** (persistido en `RefreshToken` y entregado como cookie **HttpOnly**, `SameSite=strict`, `Path=/api/auth`). El refresh token nunca viaja en el cuerpo.
- **Cada petición protegida**: `withAuth` (a) verifica la firma/vigencia del access token, y (b) **consulta la BD** para confirmar que el usuario existe, está activo y **cuál es su rol actual** — autoriza contra ese rol, no contra el del token. Falla cerrado (503) si no puede leer la BD.
- **Refresco**: `refreshAccessToken` valida la fila del refresh token (existencia, no revocado, no expirado) antes de verificarlo, **rota** el token (revoca el viejo, emite uno nuevo) y devuelve el par nuevo.
- **Rate limiting** (`proxy.ts` + `lib/rate-limit.ts` / `lib/auth-rate-limit.ts`): global por usuario/IP, estricto para credenciales (almacén PostgreSQL), y cubos dedicados para el registro público. Requiere que la app escuche solo en `127.0.0.1` (Nginx es el único camino) para que la heurística de IP no sea falsificable.

## 3. Modelo de datos

Entidades y relaciones principales (todas con `underscored: true`; soft-delete donde se indica):

| Entidad | Relación | Notas |
|---|---|---|
| **Event** | 1-N `EventSchedule` | Config pública en `registrationConfig` (tema, modo de invitados, campos, preguntas). `paranoid`. |
| **EventSchedule** | pertenece a Event | Fecha/sesión. `maxCapacity` (cupo participantes), `maxAttendees` (aforo total), `blockType`, estado. |
| **Participant** | N:M `EventSchedule` vía **ParticipantSchedule** | Origen `MANUAL`/`IMPORT`/`PUBLIC_FORM`. "Precargado" = sin fechas aún. `paranoid`. |
| **Guest** | pertenece a Participant; N:M `EventSchedule` vía **GuestSchedule** | *Invitados distintos por fecha.* Sin GuestSchedule → vale en cualquier fecha (retrocompat). `paranoid`. |
| **Accreditation** | por (participante o invitado) × `EventSchedule` | Check-in. Uno por persona y fecha. No `paranoid`. |
| **Award** / **ParticipantAward** | premios y su asignación | Stock controlado; asignar/entregar/cancelar con lock. |
| **GiftCampaign** | → `GiftType`, `GiftEmployee` → `GiftDelivery` | Campaña de regalos de Navidad. |
| **User**, **RefreshToken**, **AuditLog**, **EmailTemplate** | — | Usuarios/roles, tokens, auditoría, plantillas de correo. |

**Invitados por fecha (diseño):** el mismo participante puede inscribirse en varias fechas y llevar **invitados/cargas distintos en cada una**. Se modela con la tabla puente `GuestSchedule` (guest × schedule, con índice único). En el check-in, un invitado ligado a fechas concretas solo se acredita en esas fechas; uno sin ligaduras se acredita en cualquiera.

**Modos de invitados** (según `registrationConfig`, resueltos por `getGuestMode`):
- `named` — se registran filas `Guest` con nombre.
- `count` — solo un número (`guestCount`).
- `companion` — acompañante sí/no **más** un número de **cargas**; el máximo del evento aplica a las cargas, y el acompañante suma +1 extra.

## 4. Flujos de dominio

**Crear y publicar un evento** → se crea el Event, se le añaden `EventSchedule` (fechas), se configura el registro público (`isPublic`, `publicSlug`, `publicTemplate`, `registrationConfig`) y se abre (`registrationOpen`).

**Inscripción pública** (`/public/events/[slug]`): la página server-side lee el evento por slug y elige una de las **4 plantillas** (`default`, `gala`, `minimal`, `modern`). Dos modos:
- **Abierto**: el asistente rellena sus datos y elige fecha(s); puede agregar invitados por fecha.
- **RUT (precargado)**: el asistente se identifica con su RUT (lookup), y solo completa/actualiza su inscripción. El RUT es su identidad (solo lectura).
En ambos, al confirmar se envía un **correo de confirmación** vía EmailJS (desde el cliente) con el detalle de asistencia.

**Acreditación** (`/accreditation`): en la puerta se busca a la persona y se registra el check-in para la fecha correspondiente (`accreditationService`, con transacción y bloqueo de la fila del horario para evitar duplicados). No hay tope de aforo en la puerta: el cupo es un límite de *inscripción*, no de acreditación.

**Premios** (`/events/[eventId]/awards`): se definen premios con cantidad, se asignan a participantes (con control de stock y de duplicados, bajo lock) y se marcan como entregados.

**Regalos de Navidad** (`/gifts`): campañas con tipos y empleados; se registran entregas.

**Reportes** (`/reports`, `/events/[eventId]/reports`): panel, reporte por evento, general y de invitados, estadísticas en tiempo real, y exportación CSV.

## 5. Seguridad

- Autorización por rol contrastada contra la BD en cada petición (`withAuth`).
- Rate limiting por usuario/IP + estricto en login + cubos del registro público.
- CORS con origen real (fuente única en `middleware/security.ts`).
- Validación de entorno estricta al arrancar en producción (`lib/env.ts`): sin las variables obligatorias, **la app no arranca** (mejor que un 500 en la primera petición).
- Subidas de ficheros a un directorio absoluto y persistente (`UPLOADS_DIR`) fuera del árbol del despliegue, aprovisionado por systemd; el arranque comprueba que se puede escribir.
- Consola de BD de solo lectura (SELECT) protegida por passphrase y limitada a ADMIN.

## 6. Pruebas

Ver [`../CLAUDE.md`](../CLAUDE.md) (sección Pruebas). En resumen: `jest.setup.js` mockea globalmente modelos y `sequelize`; los tests de servicios configuran los estáticos y las transacciones; los de rutas hacen factory-mock del servicio + `withAuth` (`verifyAccessToken` + `User.findByPk`) + rate-limit. Umbral de cobertura tipo *ratchet*.

## 7. Despliegue

Droplet DigitalOcean con Nginx (TLS, sirve `UPLOADS_DIR` por `alias`) delante de `next start` en `127.0.0.1`, gestionado por systemd (`StateDirectory` para uploads, `EnvironmentFile` con las variables de producción). BD PostgreSQL administrada con SSL + CA propia. El procedimiento completo está en [`../infra/RUNBOOK.md`](../infra/RUNBOOK.md) y [`../planes/07-reconstruccion-droplet.md`](../planes/07-reconstruccion-droplet.md).
