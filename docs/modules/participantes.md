# Módulo: Participantes

Volver al [índice](../README.md).

## Propósito

El **participante** es una persona del padrón de un evento. Puede llegar de tres formas
(`registrationSource`): `MANUAL` (alta a mano), `IMPORT` (precargado por Excel) o
`PUBLIC_FORM` (se inscribió solo por la landing). Se inscribe a una o varias fechas
(`participant_schedules`), puede llevar invitados y puede ser premiado.

## Modelo de datos

### `Participant` — tabla `participants` (paranoid)
Identidad: `firstName`, `lastName`, `email`, `documentNumber` (RUT), `phone`, `numeroSap`,
`company`, `position`, `birthDate`, `age`.
Dieta: `dietaryPreference`, `dietaryComments`.
Invitados (modos numéricos): `allowedGuests`, `guestCount`, `guestCompanion`, `guestLoads`.
Estado/otros: `registrationSource`, `isNew`, `eventId`, `customData` (respuestas a
preguntas configurables), `isAwarded` + `awardReason`, `allowMultipleSchedules`,
`emailStatus` (`sent|failed|skipped|null`) + `emailError` + `emailSentAt`, `createdBy`.
Asociaciones: `belongsTo(Event)`, `belongsTo(User)`, `hasMany(Guest as 'guests')`,
`belongsToMany(EventSchedule as 'schedules')` (join `ParticipantSchedule`),
`belongsToMany(Award)` (join `ParticipantAward`).

### `ParticipantSchedule` — tabla `participant_schedules` (no paranoid)
Join participante↔fecha: `participantId`, `scheduleId`, `attended`, `attendedAt`.

## Servicios — `participantService` (`src/services/participantService.ts`)

- `createParticipant(data)` / `updateParticipant(id, data)` — alta/edición validadas con Zod.
  `updateParticipant` filtra los `scheduleIds` para que solo acepte fechas del mismo evento.
- `deleteParticipant(id, userId?, reason?)` — **cascada en transacción**: borra inscripciones
  (`participant_schedules`) e invitados, luego el participante. Mensaje honesto.
- `bulkDeleteParticipants(eventId, {ids|all}, userId?)` — borra seleccionados o vacía el
  evento (participantes + invitados + acreditaciones), en transacción.
- `bulkCreateParticipants(...)` / `importParticipants(...)` — carga masiva (Excel).
- `listParticipants(eventId, filters, pagination)` — filtros: `name`, `email`, `accredited`,
  `withAward`, `awarded`, `registered`, `mail` (`sent|failed|unsent`). Incluye conteo de invitados.
- `searchParticipants(eventId, query)` — búsqueda por nombre/correo/RUT (tolerante al formato
  del RUT); **incluye `guests` y `schedules`** (lo usa el buscador de acreditación).
- `getParticipant(id, includeGuests?, includeAwards?)`.
- `revertToPreloaded(id)` — devuelve un inscrito a estado "precargado".

## API / endpoints

| Método | Path | Roles | Qué hace |
| --- | --- | --- | --- |
| GET | `/api/events/[eventId]/participants` | ADMIN, MANAGER, OPERATOR, GUARD | Lista/busca padrón (`?search=` usa `searchParticipants`). |
| DELETE | `/api/events/[eventId]/participants` | ADMIN, OPERATOR | Borrado masivo (`{ids}` o `{all:true}`). |
| POST | `/api/events/[eventId]/participants/import` | ADMIN, OPERATOR | Importación masiva. |
| POST | `/api/participants` | ADMIN, OPERATOR | Crea participante (descarta `userId` del body). |
| GET | `/api/participants/[participantId]` | ADMIN, MANAGER, OPERATOR | Detalle. |
| PUT | `/api/participants/[participantId]` | ADMIN, OPERATOR | Edita. |
| DELETE | `/api/participants/[participantId]` | ADMIN, OPERATOR | Borra (cascada). |
| POST | `/api/participants/[participantId]/revert` | ADMIN, OPERATOR | Revierte a precargado. |
| GET/POST | `/api/participants/[participantId]/guests` | ADMIN, MANAGER, OPERATOR / ADMIN, OPERATOR | Invitados del participante. |
| PATCH | `/api/participants/[participantId]/email-status` | ADMIN, OPERATOR | Marca estado de envío de correo. |
| GET | `/api/participants/[participantId]/awards` | ADMIN, OPERATOR, GUARD | Premios del participante. |

## Componentes / stores

- `store/participantStore.ts` — `fetchParticipantsByEvent`, `fetchParticipantById`,
  `searchParticipants`, `createParticipant`, `updateParticipant`, `deleteParticipant`,
  `bulkDeleteParticipants`, `revertToPreloaded`.
- `components/participants/` — `ParticipantList` (tabla con filtros, columna de estado de
  correo con tooltip de error, reenvío de correos), `GuestList`, formularios de alta/edición.

## Flujos clave

1. **Carga**: manual (`POST /api/participants`), Excel (`.../participants/import`) o
   pública (landing → `PUBLIC_FORM`, ver [registro-publico.md](./registro-publico.md)).
2. **Búsqueda en la puerta**: el panel de acreditación llama a `?search=` → `searchParticipants`
   (trae invitados y fechas para acreditar).
3. **Correo de confirmación**: el estado (`emailStatus`/`emailError`) se muestra en
   `ParticipantList`; se puede reenviar a todos / a los fallidos / a personas puntuales.

## Notas

- El correo se envía desde el **cliente** con EmailJS; el servidor solo guarda el estado
  reportado (`email-status`). Ver [seguridad-auth.md](./modules/seguridad-auth.md) para
  las variables públicas `NEXT_PUBLIC_EMAILJS_*`.
- Campos configurables por evento (qué se pide y qué es obligatorio) en
  `src/utils/formFields.ts` (`getFormFields`).
