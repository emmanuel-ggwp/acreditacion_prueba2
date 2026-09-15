# Módulo: Eventos y horarios

Volver al [índice](../README.md).

## Propósito

Un **evento** es la unidad principal: tiene datos generales (nombre, ubicación, cupo),
configuración de la landing pública (`registrationConfig`) y una o varias **fechas u
horarios** (`EventSchedule`). Los horarios llevan su propio cupo/aforo y un **estado**
que controla el ciclo de acreditación (programado → en acreditación → cerrado).

## Modelo de datos

### `Event` — tabla `events` (paranoid)
Campos clave: `name`, `description`, `location`, `isActive`, `maxCapacity` (cupo de
participantes del evento), `allowGuests`, `maxGuestsPerParticipant`, `createdBy`,
`publicSlug`, `publicTemplate` (plantilla de landing), `isPublic`, `registrationOpen`,
`registrationConfig` (JSON: modo, tema, campos, invitados, preguntas…),
`logoUrl`, `backgroundImageUrl`, `emailTemplateId`, `allowMultipleSchedules`.
Asociaciones: `belongsTo(User)` (creador), `hasMany(EventSchedule as 'schedules')`,
`hasMany(Participant)`, `hasMany(Award)`.

### `EventSchedule` — tabla `event_schedules` (no paranoid)
Campos: `eventId`, `scheduleName`, `startDateTime`, `endDateTime`,
`maxCapacity` (**cupo de participantes** de la fecha), `maxAttendees` (**aforo total** =
participantes + invitados; informativo), `location`, `blockType`
(`SINGLE|AM|PM|FULL_DAY|CUSTOM`), `label`, `imageUrl`, `isActive`,
`status` (`published|accrediting|accredited|cancelled`).

> **Cupo vs aforo (regla del dominio):** `maxCapacity` limita la **inscripción**
> (solo participantes, vía `capacityService`). `maxAttendees` es **informativo** y **no**
> bloquea la acreditación en la puerta. Ver [acreditacion.md](./acreditacion.md).

## Servicios

### `eventService` (`src/services/eventService.ts`)
- `createEvent(data, userId)` — valida con `createEventSchema`; autogenera `publicSlug` único si es público y falta.
- `updateEvent(eventId, data, userId?)` — parcial; registra cambios en auditoría.
- `deleteEvent(eventId, userId?, reason?)` — **borrado en cascada** en transacción:
  acreditaciones → premios asignados → inscripciones → invitados → participantes →
  premios → horarios; el evento queda soft-delete. Evita huérfanos y cuentas infladas.
- `getDeletionSummary(eventId)` — cuenta lo que se eliminaría (fechas, participantes,
  invitados, premios, acreditaciones); alimenta la confirmación de borrado en la UI.
- `getEventById(eventId, includeSchedules?)`, `getAllEvents(...)`, `getSchedulesForEvent(eventId)`.
- `refreshScheduleStatuses(eventId?)` / `_updateScheduleStatuses` — transición automática por
  tiempo: `published → accrediting` al llegar `startDateTime`; `accrediting → accredited`
  al pasar `endDateTime`. El estado es informativo: **no** bloquea acreditar.

### `eventScheduleService` (`src/services/eventScheduleService.ts`)
- `createSchedule`, `updateSchedule`, `deleteSchedule` (bloquea si hay acreditaciones),
  `getSchedulesByEvent`, `getActiveSchedules` (para la pantalla de acreditación),
  `searchSchedules`, `setStatus` (`published|accrediting|accredited|cancelled`),
  `setImage`.

### `capacityService` (`src/services/capacityService.ts`)
- `getScheduleParticipantCount(scheduleId)` / `getEventParticipantCount(eventId)` — cuentan
  **solo participantes** (no invitados) vía `participant_schedules`, excluyendo borrados.
- `annotateEventCapacity(eventPlain)` — anota "lleno" y cupos restantes por fecha para la landing.

## API / endpoints

| Método | Path | Roles | Qué hace |
| --- | --- | --- | --- |
| GET | `/api/events` | ADMIN, MANAGER, OPERATOR, GUARD | Lista/filtra eventos. |
| POST | `/api/events` | ADMIN, OPERATOR | Crea evento. |
| GET | `/api/events/[eventId]` | ADMIN, OPERATOR | Detalle (con `?includeSchedules=true`); `?deletionSummary=true` → resumen de borrado. |
| PUT | `/api/events/[eventId]` | ADMIN, OPERATOR | Actualiza evento. |
| DELETE | `/api/events/[eventId]` | ADMIN | Borra evento (cascada). |
| GET | `/api/events/[eventId]/schedules` | ADMIN, MANAGER, OPERATOR, GUARD | Fechas del evento. |
| POST | `/api/events/[eventId]/schedules` | ADMIN, OPERATOR | Crea fecha. |
| PUT | `/api/events/[eventId]/schedules/[scheduleId]` | ADMIN, OPERATOR | Edita fecha. |
| PATCH | `/api/events/[eventId]/schedules/[scheduleId]` | ADMIN, OPERATOR, GUARD | Estado/imagen. GUARDIA **solo** abrir/cerrar acreditación (no `cancelled` ni imagen). |
| DELETE | `/api/events/[eventId]/schedules/[scheduleId]` | ADMIN, OPERATOR | Borra fecha. |
| GET | `/api/events/[eventId]/email-template` | ADMIN, OPERATOR | Plantilla de correo del evento. |

## Componentes / stores

- `store/eventStore.ts` — `fetchEvents`, `fetchEventById`, `createEvent`, `updateEvent`,
  `deleteEvent`, `getEventDeletionSummary`, `fetchSchedulesForEvent`, `createSchedule`,
  `updateSchedule`, `deleteSchedule`, `setScheduleStatus`.
- `components/events/` — `EventCard` (tarjeta + menú, borrado con resumen en cascada),
  `EventForm` (crear/editar; pestañas General/Diseño/Registro/Formulario, incluye
  toggles de campos de participante e invitado), `ScheduleList`, `EventStatusBadge`,
  `ButtonEventReport`.

## Flujos clave

1. **Crear evento** → `EventForm` (General: nombre, cupo, invitados; Registro: público,
   plantilla, modo; Formulario: campos y preguntas) → `POST /api/events`.
2. **Agregar fechas** → `POST /api/events/[id]/schedules` (cupo de participantes y aforo).
3. **Abrir/cerrar acreditación** de una fecha → `PATCH .../schedules/[id]` con `status`.
4. **Borrar evento** → confirmación muestra el resumen (`getDeletionSummary`) → `DELETE`
   con cascada transaccional.

## Notas

- El estado del horario se auto-actualiza por tiempo, pero acreditar **nunca** se bloquea
  por estado, cupo ni aforo (solo la inscripción respeta el cupo).
- `registrationConfig` es un JSON amplio validado por `registrationConfigSchema`
  (`src/utils/validators/eventSchemas.ts`); ver [registro-publico.md](./registro-publico.md).
