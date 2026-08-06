# Plan 01 — Regresiones que introdujo el Bloque A

> **Bloquea el despliegue.** Todo lo que hay aquí lo rompió la propia remediación, entre el
> 2026-08-05 y el commit `03a2ad1`. Son fallos **activos**: el flujo de acompañantes del registro
> público está roto ahora mismo, y el correo de confirmación miente al asistente.

**Origen:** revisión adversarial de `03a2ad1` (A3+A4). Cada hallazgo se verificó contra el código
antes de escribir este plan; las referencias `fichero:línea` son del árbol actual.

**Método:** ver [README.md](README.md). Implementador → crítico por fase, parada si el crítico
marca `rehacer`.

---

## Fase 1 — El cupo de invitados vale 0 por defecto y descarta todos los acompañantes

**Gravedad: la más alta del plan.** Rompe el flujo estrella del producto y falla en silencio.

### Qué pasa

`register/route.ts:254-262` calcula `effectiveGuestCap`. Con los valores por defecto reales:

- `eventSchemas.ts:97` → `maxGuestsPerParticipant: z.number().int().min(0).default(0)`
- `EventForm.tsx:167` → `maxGuestsPerParticipant: event?.maxGuestsPerParticipant ?? 0`

**Todo evento creado desde la aplicación nace con `maxGuestsPerParticipant = 0`.** El
`defaultValue: 2` de `Event.ts:99-102` no llega a aplicarse porque la API siempre manda el campo.
`allowedGuests` del participante también es 0 por defecto (`Participant.ts:146-149`).

Resultado: `effectiveGuestCap = 0` → `remainingGuestSlots = 0` → `route.ts:298` descarta **todos**
los invitados nuevos. Y `GalaTemplate.tsx:582` sigue mostrando «¿Asistes con acompañante?» porque
solo mira `event.allowGuests` (por defecto `true`), sin consultar el máximo.

El asistente marca acompañante, escribe su nombre, recibe **201** y un correo de confirmación
(`GalaTemplate.tsx:258-267`) **que lista a un acompañante que no se guardó**.

Antes de `03a2ad1` la fila sí se creaba. La verificación de aquel commit no lo detectó porque se
hizo con `allowed_guests = 2`; con el valor por defecto el resultado se invierte.

### Segundo defecto en el mismo cálculo

`route.ts:266-269` cuenta **todas** las filas `Guest` del participante, incluidas las **cargas
precargadas por el administrador**. Pero `allowedGuests` nunca significó «filas totales en la
tabla»: las cargas son presupuesto del organizador, no del asistente. Un participante con 2 cargas
precargadas y un máximo de 2 se queda sin poder añadir acompañante — y las cargas que **no**
selecciona también le consumen cupo.

### Qué hacer

1. **Decidir el cupo cuando no hay uno declarado.** El defecto es que `0` significa a la vez «cero
   invitados» y «sin configurar». Verificar con el código en la mano qué distingue ambos casos
   (`event.allowGuests`, `registrationConfig.guests.mode`) y hacer que un evento que **permite**
   invitados pero no declara máximo no acabe con cupo 0. **Corregir el origen si procede**: el
   `.default(0)` de `eventSchemas.ts:97` frente al `defaultValue: 2` del modelo es la
   contradicción de fondo.
2. **No contar las cargas precargadas contra el cupo del asistente.** Contar solo los invitados
   creados por el propio formulario público — hay que encontrar cómo distinguirlos (revisar si
   `Guest` tiene un campo que lo permita; si no lo tiene, decidir si se añade o se acota de otra
   forma, y **preguntarlo** en el informe de fase).
3. **Que el cliente y el servidor digan lo mismo.** Si el cupo es 0, `GalaTemplate.tsx:582` no debe
   ofrecer acompañante. Si el servidor descarta invitados, **no puede devolver 201 silencioso**:
   o los acepta, o lo dice.
4. `NaN` y negativos: `Math.max(0, NaN)` es `NaN` y `createdGuests >= NaN` es siempre falso, con lo
   que el tope desaparece. Sanear la entrada del cálculo.

### Verificación exigida (W3)

- Evento creado **desde la aplicación** (sin tocar `maxGuestsPerParticipant`), modo `rut`,
  asistente que marca acompañante → el acompañante **existe** en la tabla `guests` y el 201 es
  cierto.
- Participante con 2 cargas precargadas y máximo 2 → puede añadir su acompañante.
- Evento con `allowGuests = false` → sigue sin poder añadir invitados.
- El caso que motivó el tope: 50 invitados en una petición siguen sin crear 50 filas.

---

## Fase 2 — El commit escribe sobre participantes ya inscritos, que es justo lo que decía impedir

**Depende de la fase 1** (tocan el mismo bloque de código).

### Qué pasa

`03a2ad1` afirma «ya inscrito → NO se escribe ni un campo personal». Es falso por dos caminos,
ambos alcanzables cuando `allowMultipleSchedules` está activo:

**a) `route.ts:274-281`** — el recorte de `guestCount`/`guestLoads` corre **fuera** de la guarda
`existingScheduleIds.length === 0`. Los dos campos están en `RUT_UPDATABLE_FIELDS`
(`participantSchemas.ts:139-141`), es decir son campos personales según la definición del propio
commit. Un participante con `guestCount = 5` puesto a mano por el organizador ve su dato
**destruido** al inscribirse a una segunda fecha, y lo dispara cualquiera que conozca su RUT.

**b) `route.ts:285-293`** — la rama `g.id` no comprueba «ya inscrito» ni tiene tope.
`lookup/route.ts:58-65` entrega los `id` de todos los invitados a cualquiera que acierte un RUT,
sin autenticación. Un atacante puede inscribir a la víctima en una segunda fecha y **reasignar
todas sus cargas** a esa fecha. Los `id` están acotados a `participantId`, así que no toca cargas
ajenas — solo destroza las de la persona a la que el commit decía proteger.

### Qué hacer

Mover ambas escrituras dentro de la guarda de «no inscrito», o justificar por escrito por qué una
de ellas debe seguir fuera. La invariante que el plan quiere es simple y debe poder enunciarse en
una línea: **si `existingScheduleIds.length > 0`, ninguna columna del participante ni de sus
invitados cambia**, salvo el enlace a la fecha nueva.

### Verificación exigida (W3)

- Participante ya inscrito, evento con multi-fecha, petición con `guestCount` distinto y una carga
  en `guests[].id` → la fecha nueva se enlaza y **ni `guest_count` ni `guests.scheduleId` cambian**.
- Consultado en PostgreSQL, no por la respuesta de la API.
- El caso legítimo sigue vivo: un precargado **no** inscrito completa sus datos y su acompañante.

---

## Fase 3 — Validaciones nuevas que rechazan datos legítimos con 400

### Qué pasa

`participantSchemas.ts:84` puso `dietaryPreference: z.string().trim().max(60)` en el invitado. Pero
el cliente **no manda el código de dieta**: manda el texto compuesto por `dietary.ts:74-80`, que es
`"<etiqueta>: <texto libre>"` (`PublicRegistrationForm.tsx:186`, `GalaTemplate.tsx:211`).

`"Alergia: "` son 9 caracteres, así que **cualquier detalle de alergia de más de 51 caracteres
revienta la petición entera** con 400 y el usuario ve solo «Validation error». El input no tiene
`maxLength` y la columna admite 255 (`Guest.ts:80-83`).

El mismo tope de 60 está en `rutRegistrationSchema.dietaryPreference` (`:155`): un participante
precargado cuya preferencia guardada supere 60 caracteres queda **bloqueado de forma permanente**.

Y al revés: `rutRegistrationSchema.dietaryComments` admite 1000 caracteres (`:156`) mientras la
columna es `VARCHAR(255)` (`Participant.ts:141-145`) — 300 caracteres dan **500**, no 400.

### Qué hacer

Alinear cada `.max()` con **la columna que respalda el campo**, no con un número elegido a ojo.
Revisar los topes que introdujo `03a2ad1` uno por uno contra el modelo Sequelize correspondiente.
Añadir `maxLength` en los inputs de texto libre para que el freno sea visible antes de enviar.

**No ampliar el alcance a F4-03** (los `.max()` que faltan en los otros ocho ficheros de
validadores): eso es el plan 04. Aquí solo lo que este commit rompió.

### Verificación exigida (W3)

- Alergia de 200 caracteres desde el formulario público → **se guarda**, no da 400.
- Comentario de dieta de 300 caracteres → error **400 con mensaje claro**, nunca 500.
- Precargado con preferencia larga → puede inscribirse.

---

## Fase 4 — El 500 que el commit dijo cerrar sigue abierto, una línea más arriba

### Qué pasa

`03a2ad1` presume de que «`participantId` pasa a validarse como UUID, lo que de paso cierra un
500». Pero `scheduleIds` se consume **crudo y antes** de que corra la validación:

- `route.ts:45` → `const scheduleIds = Array.isArray(body.scheduleIds) ? body.scheduleIds : []`
- `route.ts:50-53` → `EventSchedule.findAll({ where: { id: scheduleIds, … } })`
- `route.ts:73` → la validación Zod corre **veinte líneas después**

`POST {"scheduleIds":["x"]}` → `invalid input syntax for type uuid` → catch → **500**.

### Qué hacer

Validar el cuerpo **antes** de la primera consulta que lo use. Es un problema de orden, no de
esquema: la validación se colocó después de código que ya consumía entrada sin validar. Revisar el
handler entero buscando otros usos de `body.*` anteriores al `safeParse`.

De paso, `route.ts:77` devuelve `validation.error.format()` al público, exponiendo la forma del
esquema. Decidir si se recorta aquí o se deja para F2-05 (plan 04) y **anotarlo**.

### Verificación exigida (W3)

- `scheduleIds: ["x"]` → **400**, no 500.
- `scheduleIds: []`, ausente, o no-array → 400 con mensaje.
- El registro legítimo sigue funcionando en los dos modos.

---

## Preguntas abiertas que el plan NO decide

Van al informe de fase para que las responda el crítico:

1. **El cupo por defecto es decisión de producto.** Un evento que no declara máximo, ¿permite
   invitados sin límite, o ninguno? El código afirma hoy las dos cosas.
2. **Las cargas precargadas, ¿cuentan contra el cupo del asistente?** Si el administrador precarga
   3 cargas y el máximo es 2, ¿qué debe pasar?
3. **`PublicRegistrationForm.tsx:123-130`** carga las cargas precargadas **sin su `id`**, con lo que
   se reenvían como invitados nuevos. Antes se duplicaban en cada envío; ahora se descartan. El
   bug de duplicación quedó **tapado por accidente, no corregido**. ¿Se arregla aquí o va a backlog?
