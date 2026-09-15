# Módulo: Acreditación

Volver al [índice](../README.md).

## Propósito

Es el **check-in en la puerta**: registrar que un participante (y sus invitados) llegó a
una fecha del evento. Cada check-in es una fila `Accreditation`. La pantalla ofrece buscar
a la persona, ver sus datos (dieta, premio, invitados, si se inscribió en otra fecha),
acreditarla, corregir asistencia y consultar estadísticas, premiados y dietas.

> **Regla clave:** acreditar **nunca** se bloquea por cupo, aforo ni estado del horario.
> El cupo (`maxCapacity`) solo limita la **inscripción**; el aforo (`maxAttendees`) es
> informativo. En la puerta solo se serializa para evitar duplicados.

## Modelo de datos

### `Accreditation` — tabla `accreditations` (no paranoid)
`participantId` **o** `guestId` (uno de los dos), `eventScheduleId`, `accreditedBy`,
`accreditedAt`, `checkInTime`, `checkOutTime`, `notes`,
`guestCount` (invitados numéricos que llegaron con el participante).
Índices **únicos**: `(participant_id, event_schedule_id)` y `(guest_id, event_schedule_id)`
(parcial, `guest_id NOT NULL`) → un mismo participante/invitado no se acredita dos veces
en la misma fecha (defensa en BD además del lock).

## Servicios — `accreditationService` (`src/services/accreditationService.ts`)

- `accreditParticipant(participantId, scheduleId, accreditedBy, notes?, guestCount?)` —
  crea la acreditación del participante (y guarda invitados numéricos que llegaron).
- `accreditGuest(guestId, scheduleId, accreditedBy, notes?)` — acredita un invitado con nombre.
- `unaccreditParticipant(participantId, scheduleId, ...)` — quita la acreditación del
  participante **y la de sus invitados** en esa fecha.
- `unaccreditGuest(guestId, scheduleId, ...)` — quita solo la de un invitado.
- `setAccreditationGuestCount(participantId, scheduleId, guestCount, ...)` — corrige cuántos
  invitados numéricos llegaron.
- `bulkAccredit(items, accreditedBy)` — acreditación masiva; cada ítem en su **SAVEPOINT**
  (un fallo no aborta el resto).
- `verifyAccreditation(type, id, scheduleId, tx?)` — ¿ya está acreditado?
- Estadísticas y listas: `getScheduleStats(scheduleId)`, `getEventScheduleStats(eventId)`,
  `getAwardedList(scheduleId)` (premiados + su estado de acreditación),
  `getDietaryList(scheduleId)` (personas con requerimiento alimentario),
  `listAccreditations(filters)`, `getAccreditationById(id)`.

`_verifyAndLock(...)` (privado) bloquea la fila del horario (`FOR UPDATE`) para serializar,
valida que el evento/horario esté activo, que la persona pertenezca al evento y que no esté
ya acreditada, y sube el estado `published → accrediting`.

## API / endpoints

| Método | Path | Roles | Qué hace |
| --- | --- | --- | --- |
| POST | `/api/accreditations` | ADMIN, MANAGER, OPERATOR, GUARD | Acredita (`type`: `participant`/`guest`). |
| GET | `/api/accreditations` | ADMIN, MANAGER, OPERATOR | Lista acreditaciones (paginado). |
| DELETE | `/api/accreditations` | ADMIN, MANAGER, OPERATOR, GUARD | Des-acredita participante/invitado. |
| PATCH | `/api/accreditations` | ADMIN, MANAGER, OPERATOR, GUARD | Corrige `guestCount`. |
| PUT | `/api/accreditations` | ADMIN, MANAGER, OPERATOR, GUARD | Acreditación masiva. |
| POST | `/api/accreditations/verify` | ADMIN, OPERATOR, MANAGER, GUARD | ¿acreditado? |
| GET | `/api/accreditation/schedules` | ADMIN, OPERATOR, MANAGER, GUARD | Fechas activas para acreditar. |
| GET | `/api/accreditation/stats` | ADMIN, OPERATOR, MANAGER, GUARD | Stats de una fecha (participantes/invitados/total/premiados). |
| GET | `/api/accreditation/event-stats` | ADMIN, OPERATOR, MANAGER, GUARD | Asistencia por fecha + totales. |
| GET | `/api/accreditation/awarded` | ADMIN, OPERATOR, MANAGER, GUARD | Premiados y su estado. |
| GET | `/api/accreditation/dietary` | ADMIN, OPERATOR, MANAGER, GUARD | Requerimientos alimentarios. |

## Componentes / stores

- `store/accreditationStore.ts` — `accreditParticipant`, `accreditGuest`, `unaccredit`,
  `setGuestCount`, `verifyAccreditation`, `fetchAccreditations`, `getScheduleStats`…
- `components/accreditation/`:
  - `AccreditationPanel` — pantalla principal (elegir evento → fecha → buscar → acreditar),
    tarjetas de estadísticas y resumen "Asistencia por fecha".
  - `SearchParticipant` — buscador (nombre/correo/RUT) con anti-carreras de teclado.
  - `ParticipantCard` — ficha de la persona: datos, dieta, premio, invitados (checkboxes de
    asistencia en `named` o contador en modos numéricos), acreditar/des-acreditar, anti
    doble-toque.
  - `AwardedModal`, `DietaryModal` — listas de premiados y de dietas de la fecha.

## Flujos clave

1. **Acreditar (modo `named`)**: buscar → `ParticipantCard` → marcar invitados que asisten →
   ACREDITAR → `POST /api/accreditations` (participante) + uno por invitado; si un invitado
   falla, el participante ya quedó acreditado y se avisa cuál falló.
2. **Acreditar (modos numéricos)**: indicar cuántos invitados llegaron → se guarda en
   `Accreditation.guestCount` (editable luego con PATCH).
3. **Corregir**: des-acreditar (participante arrastra a sus invitados) o marcar/desmarcar la
   asistencia de un invitado concreto.

## Notas

- Los duplicados se evitan por partida doble: **lock** de la fila del horario + **índices
  únicos** en `accreditations`.
- Las estadísticas cuentan invitados con nombre (`COUNT(DISTINCT guest_id)`) **más** los
  numéricos (`SUM(guest_count)`), sin doble conteo.
- `getScheduleStats` reporta también "premiados del evento" (los `Participant.isAwarded`).
