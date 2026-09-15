# Módulo: Premios

Volver al [índice](../README.md).

## Propósito

Permite definir **premios** por evento (con stock) y **asignarlos** a participantes, luego
**entregarlos** (registrar la entrega). Además, un participante puede marcarse como
"premiado" (`isAwarded` + `awardReason`), lo que resalta su ficha en la puerta y aparece en
la lista de premiados y en el reporte.

## Modelo de datos

### `Award` — tabla `awards` (no paranoid)
`eventId`, `name`, `description`, `quantity` (stock), `isActive`.
Asociaciones: `belongsTo(Event)`, `hasMany(ParticipantAward)`,
`belongsToMany(Participant)` (join `ParticipantAward`).

### `ParticipantAward` — tabla `participant_awards` (no paranoid)
`participantId`, `awardId`, `assignedBy`, `deliveredAt`, `deliveredBy`, `notes`.
Índice **único** `(participant_id, award_id)` → no se asigna dos veces el mismo premio a la
misma persona.

> `Participant.isAwarded` + `awardReason` es un marcador simple ("premiado") independiente
> del stock de `Award`. La lista de premiados de la puerta usa `isAwarded`; la columna
> "Premio" del reporte CSV usa `participant_awards` con `deliveredAt` no nulo.

## Servicios

### `awardService` (`src/services/awardService.ts`)
- `createAward(data)` (requiere `eventId`), `updateAward(id, data)`, `deleteAward(id)`,
  `getAwardById(id)`, `listAwardsByEvent(eventId)` — devuelve por premio
  `assignedCount` / `deliveredCount` / `availableStock`.

### `participantAwardService` (`src/services/participantAwardService.ts`)
- `assignAward(participantId, awardId, assignedBy, notes?)` — asigna (ojo al orden de args:
  participante primero).
- `deliverAward(participantAwardId, deliveredBy)` — marca entregado; **transaccional con
  `LOCK.UPDATE`** para no exceder stock en concurrencia.
- `cancelAwardAssignment(participantAwardId)` — cancela asignación.
- `listAwardAssignments(...)`, `listParticipantAwards(participantId)`,
  `getAwardStatistics(...)`.

## API / endpoints

| Método | Path | Roles | Qué hace |
| --- | --- | --- | --- |
| GET | `/api/events/[eventId]/awards` | ADMIN, MANAGER, OPERATOR, GUARD | Premios del evento (con conteos). |
| POST | `/api/events/[eventId]/awards` | ADMIN, MANAGER, OPERATOR | Crea premio. |
| GET | `/api/awards/[awardId]` | ADMIN, MANAGER, OPERATOR | Detalle. |
| PUT | `/api/awards/[awardId]` | ADMIN, MANAGER, OPERATOR | Edita. |
| DELETE | `/api/awards/[awardId]` | ADMIN, MANAGER | Borra. |
| POST | `/api/awards/[awardId]/assign` | ADMIN, MANAGER, OPERATOR, GUARD | Asigna a un participante. |
| PATCH | `/api/participant-awards/[participantAwardId]/deliver` | ADMIN, MANAGER, OPERATOR, GUARD | Entrega (con lock). |
| DELETE | `/api/participant-awards/[participantAwardId]/cancel` | ADMIN, MANAGER, OPERATOR | Cancela asignación. |
| GET | `/api/participants/[participantId]/awards` | ADMIN, OPERATOR, GUARD | Premios de un participante. |

## Componentes / stores

- `store/awardStore.ts` — CRUD de premios y asignaciones.
- `components/awards/` — `AwardCard` (premio + acciones), `AwardDelivery` (entregar/cancelar).
- En acreditación, `AwardedModal` lista los premiados de la fecha y su estado de check-in.

## Flujos clave

1. **Definir premio**: `POST /api/events/[id]/awards` (nombre, stock).
2. **Asignar**: `POST /api/awards/[awardId]/assign` con el participante.
3. **Entregar**: `PATCH /api/participant-awards/[id]/deliver` (transaccional, respeta stock).
4. **Marcar "premiado"**: setear `Participant.isAwarded` + `awardReason` (se ve en la ficha
   de acreditación y en la lista de premiados).

## Notas

- GUARDIA puede **asignar** y **entregar** (tarea de puerta), pero no borrar premios.
- La entrega usa lock de fila para que dos entregas concurrentes no superen el stock (A6).
- El índice único evita asignaciones duplicadas del mismo premio a la misma persona (A3/A4).
