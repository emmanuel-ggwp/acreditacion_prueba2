# Módulo: Registro público (landings)

Volver al [índice](../README.md).

## Propósito

Es la **página pública de inscripción** de un evento (`/public/events/[slug]`). Según la
configuración del evento, muestra un formulario donde una persona externa se inscribe sola,
elige fecha(s) y declara invitados. Todo se controla con `Event.registrationConfig`.

## Modos y plantillas

- **Modo de inscripción** (`registrationConfig.mode`):
  - **`open`** (por defecto): formulario abierto; cualquiera se inscribe (pide RUT propio).
  - **`rut`**: hay un **padrón precargado**; la persona teclea su RUT primero → el sistema
    autocompleta sus datos (endpoint `lookup`) → completa e inscribe.
- **Plantilla** (`Event.publicTemplate`): `default`/`modern`/`minimal` usan
  `components/public/PublicRegistrationForm.tsx`; **`gala`** usa
  `components/public/templates/GalaTemplate.tsx`.
- **Modo de invitados** (`registrationConfig.guests.mode`): `named` / `count` / `companion`
  (ver [invitados.md](./invitados.md)).

## Renderizado

`src/app/public/events/[slug]/page.tsx` (SSR, `dynamic = 'force-dynamic'`) carga el evento
con sus `schedules` (alias correcto) y `annotateEventCapacity`, decide si mostrar
"finalizado"/"cerrado"/"lleno" y monta la plantilla. La página **no** usa el endpoint GET
`/api/public/events/[slug]` (ese existe aparte).

## API / endpoints (públicos, sin auth; con rate-limit)

| Método | Path | Qué hace |
| --- | --- | --- |
| GET | `/api/public/events/[slug]` | Datos públicos del evento + fechas (branding, config). |
| GET | `/api/public/events/[slug]/lookup?rut=…` | **Solo modo `rut`**: busca el precargado por RUT y autocompleta (PII mínima). Responde 404 si el evento no es modo `rut`. |
| POST | `/api/public/events/[slug]/register` | Inscribe (modo abierto o confirma precargado en modo `rut`); crea participante + invitados. |
| POST | `/api/public/events/[slug]/register/email-status` | Reporta el resultado del envío de correo (EmailJS) del cliente. |

## Validación

- `src/utils/validators/participantSchemas.ts`: `publicRegistrationSchema` (modo abierto,
  exige `documentNumber`), `rutRegistrationSchema` (modo `rut`, usa `participantId` y una
  lista blanca de campos actualizables) y `publicGuestSchema` (invitado: nombre, apellido,
  RUT, `age` coaccionada, dieta, tipo).
- `src/utils/formFields.ts`: `getFormFields` (campos de participante) y `getGuestFields`
  (campos de invitado) resuelven qué se pide y qué es obligatorio por evento.

## Componentes

- `PublicRegistrationForm.tsx` — plantillas default/modern/minimal: paso RUT (modo rut),
  formulario, selección de fecha(s), invitados condicionales (nombre/apellido/RUT/edad),
  preguntas configurables, envío + EmailJS.
- `templates/GalaTemplate.tsx` — plantilla "Gala" (pantallas de fecha con tarjetas, estilo
  oscuro configurable, imagen de éxito), misma lógica de invitados y modos.
- `CustomQuestionFields`, `RegistrationClosed`, componentes de tarjeta de fecha.

## Flujos clave

1. **Modo abierto**: landing → formulario (con su RUT) → elegir fecha(s) → invitados →
   `POST /register` → (opcional) EmailJS → `POST /register/email-status`.
2. **Modo rut**: landing → teclear RUT → `GET /lookup` (autocompleta) → elegir fecha →
   confirmar → `POST /register` con `participantId`.

## Notas de seguridad

- `lookup` solo responde en eventos **modo `rut`** (evita cosecha de PII por RUT en eventos
  abiertos) y devuelve **PII mínima** (solo los campos que el formulario del evento usa).
- Los endpoints públicos están **rate-limited** por IP (`src/lib/rate-limit.ts`,
  `limitPublicLookup` es el más estricto).
- El cupo de inscripción (solo participantes) se valida en `register`; los invitados no
  cuentan para el cupo. La carrera de cupo en registros concurrentes es un punto conocido.
