# Módulo: Invitados

Volver al [índice](../README.md).

## Propósito

Un invitado (o "carga"/"acompañante") acompaña a un participante. Hay **dos maneras** de
declararlos, según el **modo de invitados** del evento (`registrationConfig.guests.mode`):

- **`named`** (con nombre): cada invitado es una **fila `Guest`** con nombre y, si el
  evento lo pide, apellido/RUT/edad. Se pueden acreditar uno por uno.
- **`count`** (solo número) / **`companion`** (acompañante + cargas): **no** hay filas
  `Guest`; se guardan **contadores** en el participante (`guestCount`, `guestCompanion`,
  `guestLoads`) y en la acreditación (`Accreditation.guestCount`).

## Modelo de datos

### `Guest` — tabla `guests` (paranoid)
`participantId`, `firstName`, `lastName`, `documentNumber`, `email`, `phone`, `birthDate`,
`age`, `guestType`, `relationship`, `dietaryPreference`, `customData`, `confirmed`,
`scheduleId`, `registrationSource` (`MANUAL|IMPORT|PUBLIC_FORM`).
Asociación: `belongsTo(Participant as 'participant')`.

> Los contadores numéricos viven en `Participant` (`guestCount`/`guestCompanion`/`guestLoads`)
> y en `Accreditation.guestCount` (cuántos llegaron). Ver [participantes.md](./participantes.md)
> y [acreditacion.md](./acreditacion.md).

## Campos configurables por evento

`src/utils/formFields.ts` → `getGuestFields(registrationConfig)` resuelve, para el modo
`named`, qué se pide de cada invitado con sus defaults (que **no** cambian el comportamiento
histórico):

| Campo | Default |
| --- | --- |
| `lastName` (Apellido) | visible, opcional |
| `documentNumber` (RUT) | oculto |
| `age` (Edad) | oculto |

El **Nombre siempre se pide**. Estos toggles se editan en `EventForm` (pestaña General,
bloque "Datos de cada invitado") y se guardan en `registrationConfig.guests.formFields`.

## Servicios — `guestService` (`src/services/guestService.ts`)

- `addGuest(participantId, data)` / `updateGuest(id, data)` — alta/edición (validadas).
- `deleteGuest(id)` — borrado.
- `listGuestsByParticipant(participantId)`.

## API / endpoints

| Método | Path | Roles | Qué hace |
| --- | --- | --- | --- |
| GET | `/api/participants/[participantId]/guests` | ADMIN, MANAGER, OPERATOR | Lista invitados. |
| POST | `/api/participants/[participantId]/guests` | ADMIN, OPERATOR | Agrega invitado. |
| PUT | `/api/guests/[guestId]` | ADMIN, OPERATOR | Edita invitado. |
| DELETE | `/api/guests/[guestId]` | ADMIN, OPERATOR | Borra invitado. |

En el **registro público**, los invitados se envían dentro del POST de inscripción y se
crean en la ruta `/api/public/events/[slug]/register` (persistiendo `documentNumber` y
`age` cuando el evento los pide). Ver [registro-publico.md](./registro-publico.md).

## Componentes / stores

- `store/guestStore.ts` — CRUD de invitados de un participante.
- `components/participants/GuestList.tsx` — gestión de invitados con nombre.
- En las landings, los inputs de invitado (nombre/apellido/RUT/edad) se renderizan
  condicionalmente según `getGuestFields`, tanto en `PublicRegistrationForm` como en
  `GalaTemplate` (incluido el bloque de acompañante de los modos numéricos).

## Flujos clave

1. **Modo `named`**: al inscribirse (o desde administración) se crean filas `Guest`. En la
   puerta se acreditan individualmente y se puede marcar quién asistió.
2. **Modos `count`/`companion`**: solo se declara un número; al acreditar se registra
   cuántos llegaron en `Accreditation.guestCount` (editable después).

## Notas

- En modo `named`, el detalle de dieta del invitado se guarda dentro de
  `dietaryPreference` (el `Guest` no tiene columna de comentarios): p. ej. "Alergia: maní".
- Los invitados **no** cuentan para el cupo de inscripción (que es solo de participantes),
  pero sí suman en el **aforo** informativo y en las estadísticas de asistencia.
