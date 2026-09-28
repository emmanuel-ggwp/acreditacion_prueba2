# Referencia de la API REST

Documentación de todos los *route handlers* bajo `src/app/api/**/route.ts` (Next.js 16 App Router + Sequelize + TypeScript). Generada leyendo el código fuente; los roles, métodos y esquemas reflejan la implementación real.

## Modelo de autenticación

- **Access token (Bearer)**: la mayoría de las rutas están envueltas en `withAuth(handler, [ROLES])` (`src/middleware/auth.ts`). El cliente envía el JWT de acceso en la cabecera `Authorization: Bearer <token>`. El token se verifica criptográficamente (`verifyAccessToken`) y, además, **el usuario y su rol se contrastan contra la base de datos en cada petición** (la BD es la fuente de verdad): si la cuenta no existe → `401`; si está deshabilitada (`isActive === false`) → `403`; si la consulta a la BD falla → `503` (falla cerrado). La autorización de rol se hace con el **rol de la BD**, no con el del token, de modo que una degradación de permisos surte efecto en la siguiente petición.
- **Refresh token (cookie HttpOnly)**: el token de refresco (30 días) NO viaja en el cuerpo; se entrega y se lee en una cookie `HttpOnly` (`REFRESH_COOKIE`, `src/lib/authCookie.ts`). `/api/auth/refresh` lo rota en cada uso (revoca el anterior y reescribe la cookie).
- **Rutas públicas**: sin `withAuth`. Marcadas como **Público**. Incluyen `login`, `logout`, `refresh`, `health`, la entrega de imágenes subidas y todo `/api/public/**`.

### Roles y jerarquía

Definidos en `@/utils/constants` (`ROLES`). El valor de `GUARD` es la cadena `'GUARDIA'`.

| Constante | Valor en BD | Etiqueta | Acceso |
| --- | --- | --- | --- |
| `ADMIN` | `ADMIN` | Administrador | Acceso total (incluye Configuración, Usuarios, Actividad). |
| `MANAGER` | `MANAGER` | Gerente | Gestión completa: Panel, Eventos, Participantes, Acreditación, Premios, Reportes, Regalos. |
| `OPERATOR` | `OPERATOR` | Operador | Operación: Eventos, Participantes, Acreditación, Premios, Reportes, Regalos. |
| `GUARD` | `GUARDIA` | Acreditador Eventos | Panel, Acreditación y Regalos (rol de "puerta"). |

No hay una jerarquía numérica: cada ruta declara la **lista exacta** de roles permitidos. En las tablas de abajo, la columna *Roles* es esa lista literal (se usa `GUARDIA` para el valor real). "Público" = sin `withAuth`.

### Envelope de errores estándar

No hay un envelope único; conviven dos estilos según el módulo:

- **Auth** (`/api/auth/*`): éxito `{ success: true, data: ... }`; error `{ success: false, error: <mensaje | issues[] > }`.
- **Resto de rutas**: éxito devuelve el recurso directamente (objeto/array) o `{ ok: true }` / `{ message: '...' }`. Error devuelve normalmente `{ message: string }`, con variantes:
  - Validación Zod: `{ message: 'Validation failed', errors: <issues> }` (o `{ error: 'Validation error', details: ... }` en el registro público).
  - Rutas de participantes/invitados (vía `errorHandler`): `{ message, details }`.
  - Algunas rutas usan `{ error: string }`.

Códigos de estado habituales: `200` OK, `201` Creado, `400` Validación/regla de negocio, `401` No autenticado, `403` Sin permisos / cuenta deshabilitada / passphrase incorrecta, `404` No encontrado, `409` Conflicto (duplicado / capacidad), `429` Límite de peticiones, `500` Error interno, `503` BD no disponible (solo `withAuth`).

### Límite de peticiones (rate limiting)

- **Global (`src/proxy.ts` → `@/lib/rate-limit`)**: TODAS las peticiones a `/api/*` pasan por `rateLimitMiddleware` en el proxy (middleware Edge de Next 16). Dos cubos en memoria: **autenticado** por usuario (`600/min`, si el JWT tiene firma válida) y **anónimo** por IP (`120/min`). Responde `429` con `Retry-After`.
- **Credenciales (`@/lib/auth-rate-limit`, almacén PostgreSQL, falla cerrado)**: solo `/api/auth/login`. `authRateLimit` por IP (`60 / 15 min`) + cubo por `(email, ip)` (`10 intentos FALLIDOS / 15 min`) comprobado antes de bcrypt y consumido solo al fallar; se resetea el cubo de credencial al acertar.
- **Rutas públicas dedicadas (`@/lib/rate-limit`, por IP)**: `limitPublicLookup` (`20/min`) en el lookup por RUT; `limitPublicRegister` (`12/min`) en el registro público y en su `email-status`.
- `/api/auth/refresh` y `/api/auth/register` invocan además `rateLimitMiddleware` dentro del handler (cubo general, contador de Node independiente del Edge).

---

## Auth

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/login` | Público | Inicia sesión; devuelve `user` + access token y fija la cookie de refresh. Rate-limit de credenciales. | `loginSchema`: `email` (máx 254, formato email), `password` (min 1). |
| POST | `/api/auth/logout` | Público | Cierra sesión: revoca el refresh de la cookie (si existe) y la borra. Idempotente. | Sin cuerpo; usa la cookie `REFRESH_COOKIE`. |
| POST | `/api/auth/refresh` | Público | Rota el refresh token de la cookie y devuelve un nuevo access token. Rate-limit general. | Sin cuerpo; usa la cookie `REFRESH_COOKIE`. |
| POST | `/api/auth/register` | ADMIN | Crea un usuario (alta desde administración). Rate-limit general. | `registerSchema`: `username` (min 3), `email`, `password` (`passwordSchema`: 8+ y 4 clases), `firstName`, `lastName`, `role` (enum de ROLES). |

## Health

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Público | Comprueba la conexión a la BD (`sequelize.authenticate`). No filtra detalles del error. | — |

## Events

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/events` | ADMIN, MANAGER, OPERATOR, GUARDIA | Lista eventos con filtros/paginación; con `?mode=schedules` busca horarios por `name`/`from`/`to`. | `eventFilterSchema` (query): `isActive`, `createdBy`, `includeSchedules`, `page`, `limit`, `search`, `sortBy`, `sortOrder`, `filter`. |
| POST | `/api/events` | ADMIN, OPERATOR | Crea un evento. | `createEventSchema` (evento sin `id`/`isActive`/`createdBy`): `name`, `maxCapacity`, `allowGuests`, `maxGuestsPerParticipant`, `isPublic`, `registrationOpen`, `registrationConfig`, etc. |
| GET | `/api/events/{eventId}` | ADMIN, OPERATOR | Obtiene un evento; `?includeSchedules=true` incluye horarios; `?deletionSummary=true` devuelve el resumen de borrado en cascada. | Query: `includeSchedules`, `deletionSummary`. |
| PUT | `/api/events/{eventId}` | ADMIN, OPERATOR | Actualiza un evento (parcial). | `updateEventSchema` (parcial de `createEventSchema`, sin re-aplicar defaults). |
| DELETE | `/api/events/{eventId}` | ADMIN | Elimina un evento (cascada). | Query opcional: `reason`. |
| GET | `/api/events/{eventId}/export` | ADMIN, OPERATOR, MANAGER | Devuelve todos los participantes con invitados, horarios y estado de acreditación (`isAccredited`/`accreditedAt`) para exportar a Excel en el cliente. | — |
| GET | `/api/events/{eventId}/email-template` | ADMIN, OPERATOR | Resuelve el `templateId` de EmailJS del evento + datos básicos (nombre, ubicación, modo de invitados) para (re)enviar el correo. | — |

## Schedules (horarios/fechas)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/events/{eventId}/schedules` | ADMIN, MANAGER, OPERATOR, GUARDIA | Lista los horarios de un evento. | — |
| POST | `/api/events/{eventId}/schedules` | ADMIN, OPERATOR | Crea un horario en el evento. | `createScheduleSchema`: `scheduleName` (min 3), `startDateTime`, `endDateTime` (> inicio), `maxCapacity`, `maxAttendees`, `blockType`, `location`, `label`, `imageUrl`. |
| PUT | `/api/events/{eventId}/schedules/{scheduleId}` | ADMIN, OPERATOR | Actualiza un horario (parcial; valida fin > inicio en el servicio). | `updateScheduleSchema` (parcial; `blockType` opcional sin default). |
| PATCH | `/api/events/{eventId}/schedules/{scheduleId}` | ADMIN, OPERATOR, GUARDIA | Abre/cierra acreditación (`status`) o cambia imagen (`imageUrl`). GUARDIA solo puede cambiar a `published`/`accrediting`/`accredited` y NO puede cambiar la imagen. | Body: `{ status }` o `{ imageUrl }`. |
| DELETE | `/api/events/{eventId}/schedules/{scheduleId}` | ADMIN, OPERATOR | Elimina un horario. | Query opcional: `reason`. |

## Participants (participantes)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/events/{eventId}/participants` | ADMIN, MANAGER, OPERATOR, GUARDIA | Lista/pagina el padrón del evento con filtros; con `?search` hace búsqueda (opcional `scheduleId`). | Query: `page`, `limit`, `name`, `email`, `search`, `scheduleId`, `accredited`, `withAward`, `awarded`, `registered`, `mail` (`sent`/`failed`/`unsent`). |
| DELETE | `/api/events/{eventId}/participants` | ADMIN, OPERATOR | Eliminación masiva: por `ids` seleccionados o `all=true` (vaciar). | Body: `{ ids?: string[], all?: boolean }`. |
| POST | `/api/events/{eventId}/participants/import` | ADMIN, OPERATOR | Importación masiva de filas ya mapeadas desde Excel/CSV en el cliente. | Body: `{ scheduleId?, participants: [], overwriteNames?, includeProtected? }`. |
| POST | `/api/events/{eventId}/participants/enroll` | ADMIN, OPERATOR | Inscripción masiva: suma fechas a participantes seleccionados (aditivo, idempotente). | Body: `{ participantIds: string[], scheduleIds: string[] }`. |
| POST | `/api/participants` | ADMIN, OPERATOR | Crea un participante (el autor sale del token, no del body). | Body validado en `participantService` (`createParticipantSchema`); descarta `userId` del cuerpo. |
| GET | `/api/participants/{participantId}` | ADMIN, MANAGER, OPERATOR | Ficha completa del participante con invitados y horarios. | — |
| PUT | `/api/participants/{participantId}` | ADMIN, OPERATOR | Actualiza un participante. | `updateParticipantSchema` (validado en el servicio). |
| DELETE | `/api/participants/{participantId}` | ADMIN, OPERATOR | Elimina un participante. | Query opcional: `reason`. |
| POST | `/api/participants/{participantId}/revert` | ADMIN, OPERATOR | Revierte un participante inscrito a "precargado" (quita inscripción/acreditación, resetea cargas, borra acompañantes agregados). Reversible. | — |
| PATCH | `/api/participants/{participantId}/email-status` | ADMIN, OPERATOR | Registra el resultado de un (re)envío de correo hecho desde el navegador del admin. | Zod inline: `{ ok: boolean, skipped?: boolean, error?: string(≤1000) }`. |
| POST | `/api/participants/{participantId}/guest-dates` | ADMIN, OPERATOR | Asigna los invitados del participante a fechas concretas (invitados por fecha). | Body: `{ guests: [{ id?, firstName?, lastName?, documentNumber?, age?, guestType?, scheduleIds: [] }] }`. |

## Guests (invitados / acompañantes)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/participants/{participantId}/guests` | ADMIN, MANAGER, OPERATOR | Lista los invitados de un participante. | — |
| POST | `/api/participants/{participantId}/guests` | ADMIN, OPERATOR | Agrega un invitado al participante. | `createGuestSchema`: `firstName` (obligatorio), `lastName?`, `documentNumber?`, `email?`, `phone?`, `birthDate?`, `age?`, `guestType?`, `relationship?`, `dietaryPreference?`. |
| PUT | `/api/guests/{guestId}` | ADMIN, OPERATOR | Actualiza un invitado. | `updateGuestSchema` (validado en el servicio). |
| DELETE | `/api/guests/{guestId}` | ADMIN, OPERATOR | Elimina un invitado. | Query opcional: `reason`. |

## Accreditation (acreditación)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| POST | `/api/accreditations` | ADMIN, MANAGER, OPERATOR, GUARDIA | Acredita a un participante o invitado en un horario (check-in). | Body: `{ type: 'participant'\|'guest', id, scheduleId, notes?, guestCount? }`. |
| GET | `/api/accreditations` | ADMIN, MANAGER, OPERATOR | Lista acreditaciones con filtros/paginación. | Query: `eventId`, `scheduleId`, `page`, `limit`. |
| DELETE | `/api/accreditations` | ADMIN, MANAGER, OPERATOR, GUARDIA | Des-acredita (corrige errores) a un participante (y sus invitados) o invitado. | Body: `{ type, id, scheduleId }`. |
| PATCH | `/api/accreditations` | ADMIN, MANAGER, OPERATOR, GUARDIA | Edita cuántos invitados llegaron (modos numéricos count/companion). | Body: `{ id, scheduleId, guestCount }`. |
| PUT | `/api/accreditations` | ADMIN, MANAGER, OPERATOR, GUARDIA | Acreditación masiva. | `bulkAccreditationSchema`: array de `{ type, participantId?/guestId?, eventScheduleId }`. |
| POST | `/api/accreditations/verify` | ADMIN, OPERATOR, MANAGER, GUARDIA | Verifica el estado de acreditación de una persona en un horario. | `verifyAccreditationSchema`: `{ type: 'participant'\|'guest', id, scheduleId }`. |
| GET | `/api/accreditations/stats` | ADMIN, MANAGER, OPERATOR, GUARDIA | Volumetría por evento: total de acreditaciones y las de hoy. | Query: `eventId` (obligatorio). |
| GET | `/api/accreditation/stats` | ADMIN, OPERATOR, MANAGER, GUARDIA | Estadísticas de acreditación de un horario. | Query: `scheduleId` (obligatorio). |
| GET | `/api/accreditation/event-stats` | ADMIN, OPERATOR, MANAGER, GUARDIA | Resumen de asistencia por fecha del evento (participantes/invitados/total por horario + totales). | Query: `eventId` (obligatorio). |
| GET | `/api/accreditation/schedules` | ADMIN, OPERATOR, MANAGER, GUARDIA | Horarios activos para acreditar ahora (refresca estados + cupos). | — |
| GET | `/api/accreditation/awarded` | ADMIN, OPERATOR, MANAGER, GUARDIA | Lista de premiados del evento con su estado de acreditación en el horario. | Query: `scheduleId` (obligatorio). |
| GET | `/api/accreditation/dietary` | ADMIN, OPERATOR, MANAGER, GUARDIA | Lista de personas con requerimiento alimentario en el evento del horario. | Query: `scheduleId` (obligatorio). |

## Awards (premios)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/events/{eventId}/awards` | ADMIN, MANAGER, OPERATOR, GUARDIA | Lista los premios de un evento. | — |
| POST | `/api/events/{eventId}/awards` | ADMIN, MANAGER, OPERATOR | Crea un premio en el evento. | `createAwardSchema`: `name` (min 3), `description?`, `quantity` (≥ 0). |
| GET | `/api/awards/{awardId}` | ADMIN, MANAGER, OPERATOR | Obtiene un premio por id. | — |
| PUT | `/api/awards/{awardId}` | ADMIN, MANAGER, OPERATOR | Actualiza un premio. | `updateAwardSchema` (parcial de `createAwardSchema`). |
| DELETE | `/api/awards/{awardId}` | ADMIN, MANAGER | Elimina un premio. | Query opcional: `reason`. |
| POST | `/api/awards/{awardId}/assign` | ADMIN, MANAGER, OPERATOR, GUARDIA | Asigna el premio a un participante (control de stock). | `assignAwardSchema`: `participantId`, `awardId`, `assignedBy`, `notes?`. |

## Participant-Awards (premios por participante)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/participants/{participantId}/awards` | ADMIN, OPERATOR, GUARDIA | Lista los premios asignados a un participante. | — |
| PATCH | `/api/participant-awards/{participantAwardId}/deliver` | ADMIN, MANAGER, OPERATOR, GUARDIA | Marca como entregado un premio asignado. | — |
| DELETE | `/api/participant-awards/{participantAwardId}/cancel` | ADMIN, MANAGER, OPERATOR | Cancela una asignación de premio (revierte stock). | — |

## Reports (reportes)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/reports/dashboard` | ADMIN, OPERATOR, MANAGER, GUARDIA | Estadísticas del panel (global o por evento). | Zod inline: `{ eventId?: string }` (query). |
| GET | `/api/reports/events` | ADMIN, MANAGER, OPERATOR, GUARDIA | Reportes de varios eventos en lote. | Query: `ids` (coma-separado) o `id` repetido. |
| GET | `/api/reports/events/{eventId}` | ADMIN, MANAGER, OPERATOR | Reporte de un evento; `?type=general`/`type=guests` devuelve CSV (descarga), sin `type` devuelve JSON. | Query: `type` (`general`\|`guests`). |
| GET | `/api/reports/realtime/{eventId}` | ADMIN, MANAGER, OPERATOR, GUARDIA | Estadísticas en tiempo real de un evento. | — |

## Gifts (regalos)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/gift-campaigns` | ADMIN, OPERATOR, MANAGER, GUARDIA | Lista campañas de regalos. | — |
| POST | `/api/gift-campaigns` | ADMIN, OPERATOR, GUARDIA | Crea una campaña. | Body: `{ name }` (obligatorio). |
| GET | `/api/gift-campaigns/{id}` | ADMIN, OPERATOR, MANAGER, GUARDIA | Detalle de campaña + tipos + resumen. | — |
| PUT | `/api/gift-campaigns/{id}` | ADMIN, OPERATOR, GUARDIA | Actualiza una campaña. | Body libre (validado en `giftService`). |
| DELETE | `/api/gift-campaigns/{id}` | ADMIN, OPERATOR, GUARDIA | Elimina una campaña. | — |
| GET | `/api/gift-campaigns/{id}/types` | ADMIN, OPERATOR, MANAGER, GUARDIA | Lista los tipos de regalo de la campaña. | — |
| POST | `/api/gift-campaigns/{id}/types` | ADMIN, OPERATOR, GUARDIA | Crea un tipo de regalo en la campaña. | Body libre (validado en `giftService`). |
| GET | `/api/gift-campaigns/{id}/employees` | ADMIN, OPERATOR, MANAGER, GUARDIA | Lista los empleados de la campaña. | — |
| POST | `/api/gift-campaigns/{id}/employees` | ADMIN, OPERATOR, GUARDIA | Crea un empleado (origen `MANUAL`). | Body libre (validado en `giftService`). |
| POST | `/api/gift-campaigns/{id}/employees/import` | ADMIN, OPERATOR, GUARDIA | Importación masiva de empleados. | Body: `{ rows: [] }`. |
| POST | `/api/gift-deliveries` | ADMIN, OPERATOR, MANAGER, GUARDIA | Registra/actualiza la entrega de un regalo a un empleado. | Body: `{ employeeId, giftTypeId, deliveredQty }`. |
| PUT | `/api/gift-employees/{id}` | ADMIN, OPERATOR, GUARDIA | Actualiza un empleado. | Body libre (validado en `giftService`). |
| DELETE | `/api/gift-employees/{id}` | ADMIN, OPERATOR, GUARDIA | Elimina un empleado. | — |
| PUT | `/api/gift-types/{id}` | ADMIN, OPERATOR, GUARDIA | Actualiza un tipo de regalo. | Body libre (validado en `giftService`). |
| DELETE | `/api/gift-types/{id}` | ADMIN, OPERATOR, GUARDIA | Elimina un tipo de regalo. | — |

## Users (usuarios)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/users` | ADMIN | Lista los usuarios. | — |
| POST | `/api/users` | ADMIN | Crea un usuario. | Body validado en `userService` (política de `passwordSchema`/`registerSchema`). |
| PUT | `/api/users/{id}` | ADMIN | Actualiza un usuario. | Body validado en `userService`. |
| DELETE | `/api/users/{id}` | ADMIN | Elimina un usuario. | Query opcional: `reason`. |

## Email-templates (plantillas de correo)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/email-templates` | ADMIN, MANAGER, OPERATOR | Lista las plantillas de correo. | — |
| POST | `/api/email-templates` | ADMIN | Crea una plantilla. | `createEmailTemplateSchema`: `name` (min 2), `templateId` (min 3), `description?`, `isActive` (validado en el servicio). |
| PUT | `/api/email-templates/{id}` | ADMIN | Actualiza una plantilla. | `updateEmailTemplateSchema` (parcial). |
| DELETE | `/api/email-templates/{id}` | ADMIN | Elimina una plantilla. | — |

## Audit (auditoría)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/audit-logs` | ADMIN | Lista los registros de actividad/auditoría. | Query: `action`, `entity`, `limit` (por defecto 200). |

## Public (landings públicas de inscripción)

Todas sin `withAuth`. Las de escritura y el lookup tienen rate-limit dedicado por IP.

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| GET | `/api/public/events/{slug}` | Público | Datos del evento público por `publicSlug` (activo y público) con sus horarios, para renderizar la landing. | — |
| GET | `/api/public/events/{slug}/lookup` | Público | Busca un participante precargado por RUT (solo eventos en modo `rut`); devuelve PII mínima según los campos habilitados. Rate-limit `limitPublicLookup` (20/min). | Query: `rut` (obligatorio). |
| POST | `/api/public/events/{slug}/register` | Público | Inscribe a un participante desde la landing (modos `open` y `rut`), con invitados y control de capacidad. Rate-limit `limitPublicRegister` (12/min). | `publicRegistrationSchema` (modo open) o `rutRegistrationSchema` (modo rut): `scheduleIds` (≥ 1 UUID), datos de participante, `guests`/`guestsBySchedule`, `customData`. |
| POST | `/api/public/events/{slug}/register/email-status` | Público | Persiste el resultado del envío de correo (EmailJS best-effort) de un participante del evento. Rate-limit `limitPublicRegister`. | Zod inline: `{ participantId, ok, skipped?, error?(≤1000) }`. |

## Uploads (imágenes)

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| POST | `/api/uploads` | ADMIN, OPERATOR | Sube una imagen (PNG/JPG/WEBP, máx 8 MB); nombre generado (UUID) para evitar path traversal. Devuelve `{ url }`. | `multipart/form-data` con campo `file`. |
| GET | `/api/uploads/{filename}` | Público | Sirve una imagen subida desde el disco persistente (o carpeta legacy), con caché inmutable. | — |

## Admin

| Método | Ruta | Roles | Descripción | Body/Query (schema) |
| --- | --- | --- | --- | --- |
| POST | `/api/admin/db-query` | ADMIN | Consola de solo lectura: ejecuta UNA sentencia `SELECT`/`WITH…SELECT` en una transacción `READ ONLY` (rollback siempre, tope de filas/tiempo). Requiere passphrase; apagable con `DB_CONSOLE_ENABLED=false`. | Body: `{ passphrase, sql }`. |

---

## Notas y observaciones

- **Cobertura**: 59 archivos `route.ts`, **88 handlers HTTP** documentados (todos los exports `GET/POST/PUT/PATCH/DELETE` encontrados).
- **Incoherencia de rol conocida (documentada en el propio código)**: `POST /api/participants` excluye a MANAGER a propósito para igualar `PUT`/`DELETE` de `/api/participants/{participantId}`, aunque un MANAGER sí puede ver el padrón y el botón "Nuevo participante" (referido como SB-18 en los comentarios). No es un error de esta documentación sino una asimetría real del código.
- **Gifts**: en `/api/gift-campaigns` (y varias rutas de regalos) el `GET` incluye a MANAGER pero el `POST`/escritura NO (solo ADMIN, OPERATOR, GUARDIA). Reflejado tal cual en las tablas.
- **Awards**: `POST /api/awards/{awardId}/assign` y `GET /api/participants/{participantId}/awards` permiten GUARDIA; `DELETE /api/awards/{awardId}` se restringe a ADMIN, MANAGER.
- **`withAuth` por defecto**: la firma es `withAuth(handler, allowedRoles = [ADMIN])`, pero todas las rutas pasan su lista de roles de forma explícita, así que el valor por defecto nunca aplica.
- **Validación en servicios**: varias rutas (users, gifts, algunas de participants/guests) no llaman al esquema Zod en el handler sino dentro del servicio; en esos casos la columna Body/Query nombra el esquema/servicio responsable.
