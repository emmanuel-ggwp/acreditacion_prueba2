# Prompts para Sistema de Acreditación de Eventos

> Sistema de acreditación de eventos con múltiples horarios, roles (Admin, Acreditador, Guardia), autenticación JWT con expiración y refresh, participantes con invitados y premios/regalos, reportes de asistencia y premiados. Stack: Next.js (App Router), Sequelize, Zustand, servicios de dominio y API Routes que llaman a esos servicios.

---

## PROMPT 1: Inicialización del Proyecto y Configuración Base

```text
Crea un proyecto Next.js 14+ con App Router usando TypeScript. Configura:

1. Estructura de carpetas siguiendo mejores prácticas:
   - /src/app (rutas y API)
   - /src/services (lógica de negocio)
   - /src/models (modelos Sequelize)
   - /src/lib (utilidades, configuraciones)
   - /src/store (Zustand stores)
   - /src/middleware (autenticación)
   - /src/types (TypeScript interfaces)
   - /src/components (componentes React reutilizables)
   - /src/utils (helpers y validaciones)

2. Instala y configura las siguientes dependencias:
   - next, react, react-dom
   - typescript, @types/node, @types/react
   - sequelize, sequelize-typescript
   - pg, pg-hstore (PostgreSQL)
   - jsonwebtoken, bcryptjs
   - @types/jsonwebtoken, @types/bcryptjs
   - zustand
   - zod (validación de schemas)
   - date-fns (manejo de fechas)
   - tailwindcss (estilos)

3. Crea archivos de configuración:
   - .env.example con variables necesarias
   - next.config.js optimizado
   - tsconfig.json con paths aliases
   - tailwind.config.js

4. Configura Sequelize con:
   - Conexión a PostgreSQL
   - Pool de conexiones
   - Timezone UTC
   - Logging en desarrollo

Variables de entorno necesarias:
DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, NODE_ENV
```

---

## PROMPT 2: Modelos de Base de Datos (Sequelize)

```text
Crea los modelos Sequelize con TypeScript y relaciones completas:

1. User Model (/src/models/User.ts):
   - id (UUID, PK)
   - email (unique, not null)
   - password (hashed, not null)
   - firstName, lastName
   - role (ENUM: 'ADMIN', 'ACREDITADOR', 'GUARDIA')
   - isActive (boolean, default true)
   - lastLogin (timestamp)
   - createdAt, updatedAt
   - Métodos: comparePassword, hashPassword (hooks)

2. Event Model (/src/models/Event.ts):
   - id (UUID, PK)
   - name (not null)
   - description (text)
   - location
   - isActive (boolean, default true)
   - maxCapacity (integer)
   - allowGuests (boolean, default true)
   - maxGuestsPerParticipant (integer, default 2)
   - createdBy (FK a User)
   - createdAt, updatedAt

3. EventSchedule Model (/src/models/EventSchedule.ts):
   - id (UUID, PK)
   - eventId (FK a Event)
   - scheduleName (ej: "Día 1 - Mañana")
   - startDateTime (timestamp, not null)
   - endDateTime (timestamp, not null)
   - maxCapacity (integer, nullable - hereda de Event si null)
   - isActive (boolean, default true)
   - createdAt, updatedAt

4. Participant Model (/src/models/Participant.ts):
   - id (UUID, PK)
   - eventId (FK a Event)
   - firstName, lastName (not null)
   - email (not null)
   - phone
   - documentNumber (identificación)
   - company
   - position
   - allowedGuests (integer, default 0)
   - createdBy (FK a User)
   - createdAt, updatedAt

5. Guest Model (/src/models/Guest.ts):
   - id (UUID, PK)
   - participantId (FK a Participant)
   - firstName, lastName (not null)
   - documentNumber
   - createdAt, updatedAt

6. Award Model (/src/models/Award.ts):
   - id (UUID, PK)
   - eventId (FK a Event)
   - name (not null - ej: "Premio VIP", "Kit de Bienvenida")
   - description
   - quantity (integer - stock disponible)
   - isActive (boolean, default true)
   - createdAt, updatedAt

7. ParticipantAward Model (/src/models/ParticipantAward.ts):
   - id (UUID, PK)
   - participantId (FK a Participant)
   - awardId (FK a Award)
   - assignedBy (FK a User)
   - deliveredAt (timestamp, nullable)
   - deliveredBy (FK a User, nullable)
   - notes
   - createdAt, updatedAt

8. Accreditation Model (/src/models/Accreditation.ts):
   - id (UUID, PK)
   - participantId (FK a Participant)
   - guestId (FK a Guest, nullable)
   - eventScheduleId (FK a EventSchedule)
   - accreditedBy (FK a User)
   - accreditedAt (timestamp, default now)
   - checkInTime (timestamp)
   - checkOutTime (timestamp, nullable)
   - notes
   - createdAt, updatedAt
   - Índice único: (participantId/guestId, eventScheduleId) - evita duplicados

9. RefreshToken Model (/src/models/RefreshToken.ts):
   - id (UUID, PK)
   - userId (FK a User)
   - token (text, unique, not null)
   - expiresAt (timestamp, not null)
   - isRevoked (boolean, default false)
   - createdAt

Define todas las asociaciones (hasMany, belongsTo) y usa hooks de Sequelize para:
- Hash automático de passwords en User
- Validaciones de stock en Awards
- Soft deletes donde sea necesario
```

---

## PROMPT 3: Servicios de Autenticación y JWT

```text
Crea un sistema robusto de autenticación con JWT:

1. /src/lib/jwt.ts:
   - generateAccessToken(userId, role): token de corta duración (15min)
   - generateRefreshToken(userId): token de larga duración (7 días)
   - verifyAccessToken(token): valida y decodifica
   - verifyRefreshToken(token): valida refresh token
   - Manejo de errores específicos (TokenExpiredError, JsonWebTokenError)

2. /src/services/authService.ts:
   - login(email, password): 
     * Valida credenciales
     * Verifica isActive
     * Actualiza lastLogin
     * Genera access y refresh tokens
     * Guarda refresh token en DB
     * Retorna { user, accessToken, refreshToken }
   
   - register(userData): 
     * Valida datos con Zod
     * Verifica email único
     * Hashea password
     * Crea usuario
     * Solo ADMIN puede crear usuarios
   
   - refreshAccessToken(refreshToken):
     * Verifica token en DB
     * Valida no revocado y no expirado
     * Genera nuevo access token
     * Retorna nuevo accessToken
   
   - logout(refreshToken):
     * Marca refresh token como revocado
   
   - revokeAllUserTokens(userId):
     * Revoca todos los refresh tokens del usuario
   
   - cleanExpiredTokens():
     * Job para limpiar tokens expirados (ejecutar periódicamente)

3. /src/middleware/auth.ts:
   - withAuth(handler, allowedRoles?): middleware para proteger rutas API
     * Extrae token del header Authorization
     * Valida y decodifica
     * Verifica rol si se especifica
     * Agrega user a request
     * Maneja errores 401/403
   
   - roleGuard(allowedRoles): verifica roles específicos

4. /src/utils/validators/authSchemas.ts:
   - loginSchema (Zod)
   - registerSchema (Zod)
   - Validaciones de email, password strength, etc.

Implementa rate limiting y protección contra fuerza bruta en login.
```

---

## PROMPT 4: Servicios de Eventos y Horarios

```text
Crea servicios para gestión de eventos:

1. /src/services/eventService.ts:
   - createEvent(data, createdBy):
     * Valida datos
     * Crea evento
     * Retorna evento creado
   
   - updateEvent(eventId, data, userId):
     * Verifica permisos (ADMIN o ACREDITADOR)
     * Actualiza evento
   
   - deleteEvent(eventId, userId):
     * Soft delete o validar que no tenga acreditaciones
     * Solo ADMIN
   
   - getEvent(eventId, includeSchedules?):
     * Retorna evento con/sin horarios
   
   - listEvents(filters: {isActive?, createdBy?, page, limit}):
     * Paginación
     * Filtros
     * Incluye conteos de participantes
   
   - getEventStatistics(eventId):
     * Total participantes
     * Total acreditados por horario
     * Premios entregados
     * Capacity utilizada

2. /src/services/eventScheduleService.ts:
   - createSchedule(eventId, data):
     * Valida fechas coherentes
     * Valida no solapamiento (opcional)
     * Crea horario
   
   - updateSchedule(scheduleId, data):
     * Actualiza horario
     * Valida participantes acreditados al cambiar fechas
   
   - deleteSchedule(scheduleId):
     * Valida sin acreditaciones
   
   - getSchedulesByEvent(eventId):
     * Lista horarios del evento
     * Incluye conteo de acreditados
   
   - getAvailableCapacity(scheduleId):
     * Calcula capacidad disponible

Implementa validaciones de negocio:
- Fechas de horarios dentro del rango lógico
- Capacidad no excedida
- Eventos activos para acreditación
```

---

## PROMPT 5: Servicios de Participantes e Invitados

```text
Crea servicios para gestionar participantes:

1. /src/services/participantService.ts:
   - createParticipant(data, createdBy):
     * Valida datos (Zod)
     * Valida allowedGuests <= maxGuestsPerParticipant del evento
     * Crea participante
   
   - bulkCreateParticipants(participants[], eventId, createdBy):
     * Importación masiva
     * Validación de duplicados por email
     * Transacción
     * Retorna resumen (creados, errores)
   
   - updateParticipant(participantId, data, userId):
     * Actualiza participante
     * Valida permisos
   
   - deleteParticipant(participantId, userId):
     * Valida sin acreditaciones
     * Elimina invitados asociados
   
   - getParticipant(participantId, includeGuests?, includeAwards?):
     * Retorna participante con relaciones
   
   - listParticipants(eventId, filters, pagination):
     * Lista paginada
     * Filtros: nombre, email, acreditado, conPremio
     * Include conteo de invitados
   
   - searchParticipants(eventId, query):
     * Búsqueda por nombre, email, documento
     * Para acreditación rápida

2. /src/services/guestService.ts:
   - addGuest(participantId, guestData, userId):
     * Valida límite de invitados del participante
     * Crea invitado
   
   - updateGuest(guestId, data):
     * Actualiza invitado
   
   - deleteGuest(guestId, userId):
     * Valida sin acreditaciones
   
   - listGuestsByParticipant(participantId):
     * Lista invitados del participante

Validaciones importantes:
- No exceder límite de invitados
- Email único por evento (participantes)
- Datos completos para acreditación
```

---

## PROMPT 6: Servicios de Acreditación

```text
Crea el servicio core de acreditación:

/src/services/accreditationService.ts:

1. accreditParticipant(participantId, eventScheduleId, accreditedBy, notes?):
   - Valida participante existe y pertenece al evento
   - Valida horario activo y del evento
   - Verifica capacidad disponible
   - Verifica no acreditado previamente en ese horario
   - Crea registro de acreditación
   - Retorna acreditación con datos del participante

2. accreditGuest(guestId, eventScheduleId, accreditedBy, notes?):
   - Valida invitado existe
   - Valida participante asociado y evento
   - Valida horario
   - Verifica capacidad
   - Verifica no acreditado previamente
   - Crea registro
   - Retorna acreditación

3. checkOut(accreditationId, userId):
   - Marca checkOutTime
   - Valida tiene checkInTime

4. getAccreditation(accreditationId):
   - Retorna acreditación completa con relaciones

5. listAccreditations(filters, pagination):
   - Filtros: eventId, scheduleId, date, accreditedBy
   - Incluye participante/invitado, horario
   - Paginación

6. getAccreditationsBySchedule(scheduleId):
   - Lista todas las acreditaciones de un horario
   - Para reportes de asistencia

7. verifyAccreditation(participantId | guestId, scheduleId):
   - Verifica si ya está acreditado
   - Para evitar duplicados

8. bulkAccredit(accreditations[], accreditedBy):
   - Acreditación masiva
   - Transacción
   - Validaciones en lote
   - Retorna resumen

Implementa:
- Transacciones para operaciones críticas
- Locks optimistas para evitar race conditions en capacidad
- Logs de auditoría
- Validación de horarios (no acreditar eventos pasados con más de X horas)
```

---

## PROMPT 7: Servicios de Premios y Regalos

```text
Crea sistema de gestión de premios:

1. /src/services/awardService.ts:
   - createAward(eventId, data, userId):
     * Crea premio para evento
     * Valida quantity > 0
   
   - updateAward(awardId, data, userId):
     * Actualiza premio
     * Valida stock disponible vs asignados
   
   - deleteAward(awardId, userId):
     * Valida sin asignaciones
   
   - listAwardsByEvent(eventId):
     * Lista premios del evento
     * Incluye stock disponible
   
   - getAvailableStock(awardId):
     * Calcula stock disponible

2. /src/services/participantAwardService.ts:
   - assignAward(participantId, awardId, assignedBy, notes?):
     * Valida stock disponible
     * Valida participante del mismo evento que premio
     * Asigna premio
     * Decrementa stock
     * Usa transacción
   
   - deliverAward(participantAwardId, deliveredBy):
     * Marca como entregado
     * Registra deliveredAt y deliveredBy
   
   - cancelAwardAssignment(participantAwardId, userId):
     * Cancela asignación
     * Incrementa stock
     * Solo si no entregado
   
   - listParticipantAwards(participantId):
     * Lista premios del participante
     * Estado: asignado, entregado
   
   - listAwardAssignments(awardId, delivered?):
     * Lista asignaciones de un premio
     * Filtro por entregados/pendientes
   
   - getAwardStatistics(eventId):
     * Por premio: asignados, entregados, disponibles
     * Participantes premiados vs total

Control de inventario:
- Validación de stock en tiempo real
- Transacciones para evitar over-booking
- Rollback automático en errores
```

---

## PROMPT 8: Servicios de Reportes y Estadísticas

```text
Crea servicios de reportes completos:

/src/services/reportService.ts:

1. getEventReport(eventId):
   - Información general del evento
   - Total participantes registrados
   - Total participantes + invitados acreditados
   - Desglose por horario:
     * Nombre del horario
     * Fecha y hora
     * Participantes acreditados
     * Invitados acreditados
     * Capacidad utilizada (%)
   - Premios: total asignados, entregados, pendientes
   - Timeline de acreditaciones (por hora)

2. getScheduleReport(scheduleId):
   - Información del horario
   - Lista de acreditados (participantes + invitados)
   - Hora de acreditación
   - Acreditado por (usuario)
   - Premios asociados a cada participante
   - Estadísticas de check-in por rangos horarios

3. getAttendanceReport(eventId, scheduleId?, dateRange?):
   - Reporte de asistencia
   - Filtros por horario y rango de fechas
   - Exportable (preparar datos para CSV/Excel)
   - Columnas: nombre, email, documento, horario, hora acreditación, premios

4. getAwardsReport(eventId):
   - Por premio:
     * Nombre del premio
     * Cantidad total
     * Asignados
     * Entregados
     * Pendientes de entrega
     * Stock disponible
   - Lista de participantes premiados con estado
   - Filtros por horario de acreditación

5. getUserActivityReport(userId, dateRange):
   - Actividad del usuario (auditoría)
   - Acreditaciones realizadas
   - Premios entregados
   - Por evento y fecha

6. getDashboardStats(eventId?):
   - Estadísticas para dashboard
   - Si eventId: stats del evento
   - Si no: stats globales
   - Métricas clave: total eventos, participantes, acreditaciones hoy, premios pendientes

7. getRealTimeStats(eventId):
   - Estadísticas en tiempo real
   - Para mostrar durante el evento
   - Acreditaciones en últimos 30 min
   - Capacidad actual
   - Tasa de acreditación

Implementa:
- Queries optimizadas con agregaciones SQL
- Caché para reportes pesados (Redis opcional)
- Paginación en reportes grandes
- Formato de datos para gráficos (Chart.js/Recharts)
```

---

## PROMPT 9: API Routes - Autenticación

```text
Crea las rutas API de autenticación en Next.js App Router:

1. /src/app/api/auth/login/route.ts:
   - POST: login
   - Valida body con Zod
   - Llama authService.login
   - Retorna tokens
   - Manejo de errores: 401, 400

2. /src/app/api/auth/register/route.ts:
   - POST: register (solo ADMIN)
   - Usa middleware withAuth con rol ADMIN
   - Valida body
   - Llama authService.register
   - Retorna 201 con usuario creado

3. /src/app/api/auth/refresh/route.ts:
   - POST: refresh token
   - Body: { refreshToken }
   - Llama authService.refreshAccessToken
   - Retorna nuevo accessToken

4. /src/app/api/auth/logout/route.ts:
   - POST: logout
   - Body: { refreshToken }
   - Llama authService.logout
   - Retorna 200

5. /src/app/api/auth/me/route.ts:
   - GET: obtener usuario actual
   - Usa middleware withAuth
   - Retorna user del token

Estándares:
- Respuestas consistentes: { success, data/error, message }
- Status codes apropiados
- Validación con Zod en todas las entradas
- Try-catch con logs
- Types de TypeScript para request/response
```

---

## PROMPT 10: API Routes - Eventos y Horarios

```text
Crea rutas API para eventos:

1. /src/app/api/events/route.ts:
   - GET: listar eventos (ADMIN, ACREDITADOR, GUARDIA)
     * Query params: page, limit, isActive
     * Llama eventService.listEvents
   
   - POST: crear evento (ADMIN, ACREDITADOR)
     * Body: evento data
     * Llama eventService.createEvent

2. /src/app/api/events/[eventId]/route.ts:
   - GET: obtener evento (autenticado)
     * Llama eventService.getEvent
   
   - PUT: actualizar evento (ADMIN, ACREDITADOR)
     * Llama eventService.updateEvent
   
   - DELETE: eliminar evento (ADMIN)
     * Llama eventService.deleteEvent

3. /src/app/api/events/[eventId]/schedules/route.ts:
   - GET: listar horarios del evento
     * Llama eventScheduleService.getSchedulesByEvent
   
   - POST: crear horario (ADMIN, ACREDITADOR)
     * Llama eventScheduleService.createSchedule

4. /src/app/api/events/[eventId]/schedules/[scheduleId]/route.ts:
   - GET: obtener horario
   - PUT: actualizar horario (ADMIN, ACREDITADOR)
   - DELETE: eliminar horario (ADMIN, ACREDITADOR)

5. /src/app/api/events/[eventId]/statistics/route.ts:
   - GET: estadísticas del evento
     * Llama eventService.getEventStatistics

Validaciones:
- Verificar que eventId existe
- Permisos por rol
- Schemas de validación con Zod
```

---

## PROMPT 11: API Routes - Participantes e Invitados

```text
Crea rutas API para participantes:

1. /src/app/api/events/[eventId]/participants/route.ts:
   - GET: listar participantes (autenticado)
     * Query: page, limit, search, hasAward, isAccredited
     * Llama participantService.listParticipants
   
   - POST: crear participante (ADMIN, ACREDITADOR)
     * Llama participantService.createParticipant

2. /src/app/api/events/[eventId]/participants/bulk/route.ts:
   - POST: importación masiva (ADMIN, ACREDITADOR)
     * Body: array de participantes
     * Llama participantService.bulkCreateParticipants
     * Retorna resumen de creación

3. /src/app/api/events/[eventId]/participants/search/route.ts:
   - GET: búsqueda rápida para acreditación
     * Query: q (query string)
     * Llama participantService.searchParticipants
     * Para autocomplete en UI

4. /src/app/api/participants/[participantId]/route.ts:
   - GET: obtener participante
     * Include guests y awards
   
   - PUT: actualizar participante (ADMIN, ACREDITADOR)
   
   - DELETE: eliminar participante (ADMIN, ACREDITADOR)

5. /src/app/api/participants/[participantId]/guests/route.ts:
   - GET: listar invitados
   - POST: agregar invitado (ADMIN, ACREDITADOR)

6. /src/app/api/guests/[guestId]/route.ts:
   - GET: obtener invitado
   - PUT: actualizar invitado (ADMIN, ACREDITADOR)
   - DELETE: eliminar invitado (ADMIN, ACREDITADOR)

Implementa:
- Validación de límites de invitados
- Respuestas con conteos para paginación
- Filtros combinados
```

---

## PROMPT 12: API Routes - Acreditación

```text
Crea rutas API para acreditación (funcionalidad core):

1. /src/app/api/accreditations/route.ts:
   - GET: listar acreditaciones (autenticado)
     * Query: eventId, scheduleId, page, limit
     * Llama accreditationService.listAccreditations
   
   - POST: crear acreditación (todos los roles autenticados)
     * Body: { type: 'participant'|'guest', id, scheduleId, notes }
     * Llama accreditationService.accreditParticipant o accreditGuest
     * Retorna 201 con acreditación

2. /src/app/api/accreditations/verify/route.ts:
   - POST: verificar si ya está acreditado
     * Body: { type, id, scheduleId }
     * Llama accreditationService.verifyAccreditation
     * Retorna { isAccredited, accreditation }

3. /src/app/api/accreditations/bulk/route.ts:
   - POST: acreditación masiva (ADMIN, ACREDITADOR)
     * Body: array de acreditaciones
     * Llama accreditationService.bulkAccredit

4. /src/app/api/accreditations/[accreditationId]/route.ts:
   - GET: obtener acreditación
   - PATCH: checkout
     * Llama accreditationService.checkOut

5. /src/app/api/schedules/[scheduleId]/accreditations/route.ts:
   - GET: acreditaciones de un horario
     * Para reportes en vivo
     * Llama accreditationService.getAccreditationsBySchedule

Características especiales:
- Rate limiting por usuario (prevenir spam)
- Validación en tiempo real de capacidad
- Respuesta inmediata para UX fluida
- WebSocket/SSE opcional para actualizaciones en tiempo real
```

---

## PROMPT 13: API Routes - Premios

```text
Crea rutas API para premios:

1. /src/app/api/events/[eventId]/awards/route.ts:
   - GET: listar premios del evento
     * Include stock disponible
     * Llama awardService.listAwardsByEvent
   
   - POST: crear premio (ADMIN, ACREDITADOR)
     * Llama awardService.createAward

2. /src/app/api/awards/[awardId]/route.ts:
   - GET: obtener premio
   - PUT: actualizar premio (ADMIN, ACREDITADOR)
   - DELETE: eliminar premio (ADMIN)

3. /src/app/api/awards/[awardId]/assign/route.ts:
   - POST: asignar premio a participante (ADMIN, ACREDITADOR, GUARDIA)
     * Body: { participantId, notes }
     * Llama participantAwardService.assignAward
     * Valida stock

4. /src/app/api/participant-awards/[participantAwardId]/deliver/route.ts:
   - PATCH: marcar como entregado (todos los roles)
     * Llama participantAwardService.deliverAward

5. /src/app/api/participant-awards/[participantAwardId]/cancel/route.ts:
   - DELETE: cancelar asignación (ADMIN, ACREDITADOR)
     * Llama participantAwardService.cancelAwardAssignment

6. /src/app/api/participants/[participantId]/awards/route.ts:
   - GET: premios del participante
     * Llama participantAwardService.listParticipantAwards

Validaciones:
- Control de stock en tiempo real
- Transacciones para evitar race conditions
- Solo participantes acreditados pueden recibir premios (regla de negocio)
```

---

## PROMPT 14: API Routes - Reportes

```text
Crea rutas API para reportes:

1. /src/app/api/reports/events/[eventId]/route.ts:
   - GET: reporte completo del evento (ADMIN, ACREDITADOR)
     * Llama reportService.getEventReport
     * Retorna JSON estructurado para dashboard

2. /src/app/api/reports/schedules/[scheduleId]/route.ts:
   - GET: reporte de horario específico
     * Llama reportService.getScheduleReport

3. /src/app/api/reports/attendance/route.ts:
   - GET: reporte de asistencia (ADMIN, ACREDITADOR)
     * Query: eventId, scheduleId, startDate, endDate, format
     * Llama reportService.getAttendanceReport
     * Si format=csv: genera CSV y retorna file

4. /src/app/api/reports/awards/route.ts:
   - GET: reporte de premios (ADMIN, ACREDITADOR)
     * Query: eventId
     * Llama reportService.getAwardsReport

5. /src/app/api/reports/user-activity/[userId]/route.ts:
   - GET: actividad de usuario (ADMIN)
     * Query: startDate, endDate
     * Llama reportService.getUserActivityReport

6. /src/app/api/reports/dashboard/route.ts:
   - GET: stats para dashboard
     * Query: eventId (opcional)
     * Llama reportService.getDashboardStats

7. /src/app/api/reports/realtime/[eventId]/route.ts:
   - GET: estadísticas en tiempo real
     * Llama reportService.getRealTimeStats
     * Para pantallas en vivo del evento

Implementa:
- Caché para reportes pesados (5 min)
- Exportación a CSV/Excel
- Compresión de respuestas grandes
- Streaming para reportes muy grandes
```

---

## PROMPT 15: Zustand Stores - Estado Global

```text
Crea stores de Zustand para manejo de estado:

1. /src/store/authStore.ts:
   - State: user, accessToken, refreshToken, isAuthenticated, loading
   - Actions:
     * login(email, password)
     * logout()
     * refreshToken()
     * setUser(user)
     * checkAuth() - verifica token al iniciar app
   - Persist en localStorage: tokens
   - Auto-refresh de token antes de expirar

2. /src/store/eventStore.ts:
   - State: events, selectedEvent, loading, error
   - Actions:
     * fetchEvents(filters)
     * fetchEvent(id)
     * createEvent(data)
     * updateEvent(id, data)
     * deleteEvent(id)
     * selectEvent(id)
   - Paginación y caché

3. /src/store/participantStore.ts:
   - State: participants, selectedParticipant, loading, pagination
   - Actions:
     * fetchParticipants(eventId, filters)
     * searchParticipants(eventId, query)
     * createParticipant(data)
     * updateParticipant(id, data)
     * selectParticipant(id)
     * clearParticipants()

4. /src/store/accreditationStore.ts:
   - State: accreditations, recentAccreditations, stats
   - Actions:
     * accreditParticipant(participantId, scheduleId)
     * accreditGuest(guestId, scheduleId)
     * verifyAccreditation(type, id, scheduleId)
     * fetchAccreditations(filters)
     * addToRecent(accreditation) - últimas 10 acreditaciones
   - Optimistic updates

5. /src/store/uiStore.ts:
   - State: sidebarOpen, theme, notifications, modals
   - Actions:
     * toggleSidebar()
     * setTheme(theme)
     * addNotification(notification)
     * removeNotification(id)
     * openModal(modalType, data)
     * closeModal()

Características:
- TypeScript types estrictos
- DevTools en desarrollo
- Middleware para logging
- Persistencia selectiva
- Error handling consistente
```

---

## PROMPT 16: Utilidades y Helpers

```text
Crea utilidades reutilizables:

1. /src/utils/apiClient.ts:
   - Fetch wrapper con interceptores
   - Auto-inyección de Authorization header
   - Manejo automático de refresh token en 401
   - Retry logic
   - Error handling consistente
   - Types para request/response

2. /src/utils/validators/*.ts:
   - Schemas Zod para todas las entidades:
     * userSchema, loginSchema, registerSchema
     * eventSchema, scheduleSchema
     * participantSchema, guestSchema
     * accreditationSchema
     * awardSchema
   - Validators custom: email, phone, documentNumber

3. /src/utils/formatters.ts:
   - formatDate(date, format)
   - formatDateTime(date)
   - formatName(firstName, lastName)
   - formatCapacity(used, total)
   - formatPercentage(value)

4. /src/utils/permissions.ts:
   - canAccess(userRole, requiredRoles)
   - canManageEvent(userRole)
   - canAccredit(userRole)
   - canManageUsers(userRole)
   - PERMISSIONS object con todas las reglas

5. /src/utils/constants.ts:
   - ROLES enum
   - API_ENDPOINTS
   - DATE_FORMATS
   - PAGINATION_DEFAULTS
   - ERROR_MESSAGES
   - SUCCESS_MESSAGES

6. /src/utils/errors.ts:
   - Custom error classes:
     * AuthenticationError
     * AuthorizationError
     * ValidationError
     * NotFoundError
     * ConflictError
   - errorHandler(error) - normaliza errores para UI

7. /src/lib/db.ts:
   - Singleton de Sequelize
   - Connection pooling
   - Error handling
   - Logging
   - initDB() - sincroniza modelos

Implementa:
- Types compartidos entre frontend y backend
- Validaciones isomórficas (cliente y servidor)
- Reutilización máxima de código
```

---

## PROMPT 17: Componentes React - Autenticación

```text
Crea componentes de autenticación:

1. /src/components/auth/LoginForm.tsx:
   - Form con email y password
   - Validación con Zod
   - Integración con authStore
   - Loading states
   - Error messages
   - Remember me (opcional)

2. /src/components/auth/ProtectedRoute.tsx:
   - HOC para proteger rutas
   - Verifica autenticación
   - Redirect a login si no autenticado
   - Loading state mientras verifica
   - Role-based access

3. /src/components/auth/RoleGuard.tsx:
   - Muestra contenido según rol
   - Props: allowedRoles, fallback
   - Uso: <RoleGuard allowedRoles={['ADMIN']}>...</RoleGuard>

4. /src/app/login/page.tsx:
   - Página de login
   - Usa LoginForm
   - Redirect si ya autenticado
   - Diseño responsive

Estilos con Tailwind CSS, UI moderna y accesible.
```

---

## PROMPT 18: Componentes React - Eventos

```text
Crea componentes para gestión de eventos:

1. /src/components/events/EventList.tsx:
   - Lista de eventos con cards
   - Filtros: activos, inactivos, mis eventos
   - Paginación
   - Click para ver detalles
   - Botón crear (ADMIN, ACREDITADOR)

2. /src/components/events/EventForm.tsx:
   - Form para crear/editar evento
   - Campos: name, description, location, maxCapacity, allowGuests, maxGuestsPerParticipant
   - Validación
   - Submit a eventStore

3. /src/components/events/EventCard.tsx:
   - Card de evento
   - Info: nombre, fecha, ubicación
   - Stats: participantes, acreditados, capacidad
   - Acciones: ver, editar, eliminar (según rol)

4. /src/components/events/EventDetails.tsx:
   - Vista detallada del evento
   - Tabs: Info, Horarios, Participantes, Premios, Reportes
   - Integración con otros componentes

5. /src/components/events/ScheduleList.tsx:
   - Lista de horarios del evento
   - Crear nuevo horario
   - Editar/eliminar
   - Ver acreditados por horario

6. /src/components/events/ScheduleForm.tsx:
   - Form para horarios
   - DateTime pickers
   - Validación de fechas

Páginas:
- /src/app/events/page.tsx: lista de eventos
- /src/app/events/[eventId]/page.tsx: detalles del evento
- /src/app/events/new/page.tsx: crear evento
```

---

## PROMPT 19: Componentes React - Participantes

```text
Crea componentes para participantes:

1. /src/components/participants/ParticipantList.tsx:
   - Tabla de participantes
   - Columnas: nombre, email, documento, invitados, acreditado, premios
   - Filtros y búsqueda
   - Paginación
   - Acciones: ver, editar, eliminar, acreditar

2. /src/components/participants/ParticipantForm.tsx:
   - Form completo de participante
   - Campos: firstName, lastName, email, phone, documentNumber, company, position, allowedGuests
   - Validación

3. /src/components/participants/ParticipantDetails.tsx:
   - Vista detallada
   - Secciones: Info personal, Invitados, Acreditaciones, Premios
   - Timeline de actividad

4. /src/components/participants/GuestList.tsx:
   - Lista de invitados del participante
   - Agregar nuevo invitado
   - Editar/eliminar
   - Indicador de límite alcanzado

5. /src/components/participants/GuestForm.tsx:
   - Form simple: firstName, lastName, documentNumber
   - Validación de límite

6. /src/components/participants/ParticipantImport.tsx:
   - Upload CSV/Excel
   - Preview de datos
   - Validación
   - Import masivo
   - Reporte de errores

7. /src/components/participants/ParticipantSearch.tsx:
   - Autocomplete search
   - Para acreditación rápida
   - Muestra resultados con foto/documento
   - Click para acreditar

Páginas:
- /src/app/events/[eventId]/participants/page.tsx: lista
- /src/app/participants/[participantId]/page.tsx: detalles
```

---

## PROMPT 20: Componentes React - Acreditación

```text
Crea interfaz de acreditación (UI principal para guardias):

1. /src/components/accreditation/AccreditationPanel.tsx:
   - Panel principal de acreditación
   - Selector de evento y horario
   - Búsqueda de participante/invitado
   - Botón grande "ACREDITAR"
   - Muestra capacidad disponible en tiempo real
   - Últimas acreditaciones (feed)

2. /src/components/accreditation/SearchParticipant.tsx:
   - Input con autocomplete
   - Búsqueda por nombre, email, documento
   - Resultados en tiempo real
   - Click para seleccionar

3. /src/components/accreditation/ParticipantCard.tsx:
   - Card del participante seleccionado
   - Info completa
   - Lista de invitados (checkboxes para acreditar)
   - Estado: ya acreditado o disponible
   - Premios pendientes

4. /src/components/accreditation/AccreditationConfirm.tsx:
   - Modal de confirmación
   - Resumen: quién, qué evento, qué horario
   - Textarea para notas
   - Confirmar/Cancelar
   - Loading state

5. /src/components/accreditation/RecentAccreditations.tsx:
   - Lista de últimas 10 acreditaciones
   - Nombre, hora, acreditado por
   - Animación al agregar nueva
   - Click para ver detalles

6. /src/components/accreditation/CapacityIndicator.tsx:
   - Barra de progreso
   - Usado / Total
   - Porcentaje
   - Warning si cerca del límite
   - Alert si lleno

7. /src/components/accreditation/QRScanner.tsx (opcional):
   - Escaneo de QR codes
   - Integración con cámara
   - Auto-acreditación al escanear

Página:
- /src/app/accreditation/page.tsx: interfaz principal
- Diseño optimizado para tablets
- UX rápida y fluida
- Keyboard shortcuts
- Feedback visual inmediato
```

---

## PROMPT 21: Componentes React - Premios

```text
Crea componentes para premios:

1. /src/components/awards/AwardList.tsx:
   - Lista de premios del evento
   - Cards con: nombre, descripción, stock, asignados, entregados
   - Crear nuevo premio
   - Editar/eliminar

2. /src/components/awards/AwardForm.tsx:
   - Form: name, description, quantity
   - Validación

3. /src/components/awards/AwardCard.tsx:
   - Card visual del premio
   - Progress bar de stock
   - Estadísticas
   - Acciones

4. /src/components/awards/AssignAwardModal.tsx:
   - Modal para asignar premio
   - Búsqueda de participante
   - Selector de premio
   - Notas
   - Validación de stock
   - Confirmar

5. /src/components/awards/ParticipantAwardsList.tsx:
   - Lista de premios del participante
   - Estado: asignado, entregado
   - Botón entregar (si asignado)
   - Botón cancelar (si no entregado)

6. /src/components/awards/AwardDelivery.tsx:
   - Interfaz para marcar como entregado
   - Scan de código o búsqueda
   - Lista de premios pendientes del participante
   - Checkbox para múltiples premios
   - Confirmar entrega

Página:
- /src/app/events/[eventId]/awards/page.tsx: gestión de premios
```

---

## PROMPT 22: Componentes React - Reportes y Dashboard

```text
Crea componentes de reportes:

1. /src/components/dashboard/DashboardStats.tsx:
   - Cards con métricas clave:
     * Total eventos activos
     * Acreditaciones hoy
     * Premios pendientes
     * Usuarios activos
   - Gráficos con Chart.js o Recharts

2. /src/components/reports/EventReport.tsx:
   - Reporte completo del evento
   - Secciones colapsables:
     * Info general
     * Estadísticas globales
     * Desglose por horario
     * Premios
   - Botón exportar PDF/Excel

3. /src/components/reports/AttendanceTable.tsx:
   - Tabla de asistencia
   - Filtros avanzados
   - Sorting
   - Exportar CSV
   - Print-friendly

4. /src/components/reports/AwardsSummary.tsx:
   - Resumen de premios
   - Gráfico de distribución
   - Tabla de asignaciones
   - Filtros por estado

5. /src/components/reports/RealtimeStats.tsx:
   - Stats en tiempo real
   - Auto-refresh cada 30s
   - Gráfico de acreditaciones por hora
   - Para mostrar en pantallas del evento

6. /src/components/reports/ChartAccreditations.tsx:
   - Gráfico de línea/barras
   - Acreditaciones en el tiempo
   - Comparación entre horarios

7. /src/components/reports/ExportButton.tsx:
   - Dropdown con opciones: CSV, Excel, PDF
   - Generación y descarga
   - Loading state

Páginas:
- /src/app/dashboard/page.tsx: dashboard principal
- /src/app/events/[eventId]/reports/page.tsx: reportes del evento
- /src/app/reports/page.tsx: reportes globales
```

---

## PROMPT 23: Componentes React - Layout y UI

```text
Crea componentes de layout:

1. /src/components/layout/Header.tsx:
   - Logo
   - Navegación según rol
   - User menu (dropdown)
   - Notificaciones
   - Logout

2. /src/components/layout/Sidebar.tsx:
   - Menu lateral
   - Links según rol:
     * ADMIN: todo
     * ACREDITADOR: eventos, participantes, acreditación, premios, reportes
     * GUARDIA: acreditación, premios
   - Collapse/expand
   - Active state

3. /src/components/layout/MainLayout.tsx:
   - Layout principal
   - Header + Sidebar + Content
   - ProtectedRoute wrapper
   - Breadcrumbs

4. /src/components/ui/Button.tsx:
   - Botón reutilizable
   - Variants: primary, secondary, danger, ghost
   - Sizes: sm, md, lg
   - Loading state
   - Icon support

5. /src/components/ui/Input.tsx:
   - Input con label
   - Error message
   - Helper text
   - Variants: text, email, password, number, date

6. /src/components/ui/Select.tsx:
   - Select con label
   - Error handling
   - Multi-select option

7. /src/components/ui/Modal.tsx:
   - Modal reutilizable
   - Header, body, footer
   - Close button
   - Overlay
   - Animations

8. /src/components/ui/Table.tsx:
   - Tabla reutilizable
   - Sorting
   - Pagination
   - Row actions
   - Empty state

9. /src/components/ui/Card.tsx:
   - Card container
   - Header, body, footer
   - Variants

10. /src/components/ui/Badge.tsx:
    - Badge para estados
    - Colors según tipo

11. /src/components/ui/LoadingSpinner.tsx:
    - Spinner
    - Sizes

12. /src/components/ui/Toast.tsx:
    - Notifications toast
    - Success, error, warning, info
    - Auto-dismiss

Layout principal:
- /src/app/layout.tsx: root layout con providers
- Tema claro/oscuro
- Responsive design
- Accesibilidad (ARIA)
```

---

## PROMPT 24: Testing y Documentación

```text
Implementa testing y documentación:

1. Testing Backend:
   - Jest y Supertest
   - Tests unitarios para servicios:
     * authService.test.ts
     * eventService.test.ts
     * accreditationService.test.ts
     * awardService.test.ts
   - Tests de integración para API routes
   - Mocks de Sequelize
   - Coverage > 80%

2. Testing Frontend:
   - React Testing Library
   - Tests de componentes:
     * LoginForm.test.tsx
     * AccreditationPanel.test.tsx
     * EventList.test.tsx
   - Tests de stores (Zustand)
   - Mock de API calls
   - Snapshot tests

3. E2E Testing:
   - Playwright o Cypress
   - Flujos principales:
     * Login
     * Crear evento
     * Agregar participante
     * Acreditar participante
     * Asignar premio
     * Ver reportes

4. Documentación:
   - README.md completo:
     * Descripción del proyecto
     * Arquitectura
     * Setup e instalación
     * Variables de entorno
     * Scripts disponibles
     * Estructura de carpetas
   
   - API_DOCS.md:
     * Endpoints documentados
     * Request/Response examples
     * Authentication
     * Error codes
   
   - DEPLOYMENT.md:
     * Guía de deployment
     * Database migrations
     * Environment setup
   
   - JSDoc en código crítico
   - Swagger/OpenAPI para API (opcional)

5. Scripts package.json:
   - dev, build, start
   - test, test:watch, test:coverage
   - lint, format
   - db:migrate, db:seed
   - typecheck
```

---

## PROMPT 25: Seguridad y Optimización

```text
Implementa seguridad y optimizaciones:

1. Seguridad:
   - Helmet.js para headers HTTP
   - CORS configurado correctamente
   - Rate limiting (express-rate-limit)
   - SQL injection prevention (Sequelize prepared statements)
   - XSS protection (sanitización de inputs)
   - CSRF tokens en forms
   - Password hashing con bcrypt (salt rounds: 12)
   - JWT con refresh token rotation
   - Validación estricta en backend (no confiar en frontend)
   - Logs de auditoría para acciones críticas
   - Input sanitization con DOMPurify en frontend

2. Optimización Backend:
   - Database indexes:
     * email en User
     * eventId en Participant
     * participantId, scheduleId en Accreditation
     * Composite indexes para queries frecuentes
   - Query optimization:
     * Select only needed fields
     * Eager loading con include
     * Pagination en todas las listas
   - Caching:
     * Redis para sessions y reportes (opcional)
     * Cache-Control headers
   - Connection pooling optimizado
   - Compression middleware

3. Optimización Frontend:
   - Code splitting por rutas
   - Lazy loading de componentes pesados
   - Image optimization (next/image)
   - Memoización con useMemo y useCallback
   - Debounce en búsquedas
   - Optimistic updates en Zustand
   - Service Worker para PWA (opcional)
   - Bundle size analysis

4. Monitoreo:
   - Error tracking (Sentry)
   - Performance monitoring
   - Logs estructurados (Winston)
   - Health check endpoint (/api/health)

5. DevOps:
   - Docker y docker-compose
   - CI/CD pipeline (GitHub Actions)
   - Environment-specific configs
   - Backup strategy para DB
   - Migration system
```

---

## PROMPT 26: Características Avanzadas

```text
Implementa features avanzadas:

1. Notificaciones en Tiempo Real:
   - WebSockets o Server-Sent Events
   - Notificar acreditaciones en vivo
   - Actualización de capacidad en tiempo real
   - Alertas de capacidad completa

2. Sistema de QR Codes:
   - Generar QR único por participante
   - QR incluye: eventId, participantId, scheduleId, hash
   - Scanner en interfaz de acreditación
   - Validación server-side del QR

3. Impresión de Credenciales:
   - Template de credencial
   - Generar PDF con QR
   - Imprimir desde navegador
   - Badge design personalizable

4. Exportación Avanzada:
   - Excel con múltiples sheets
   - PDF con gráficos
   - Templates personalizables
   - Scheduled exports (cron jobs)

5. Multi-tenancy (opcional):
   - Soporte para múltiples organizaciones
   - Tenant isolation en DB
   - Subdominios por tenant

6. Internacionalización:
   - next-intl o i18next
   - Español e inglés
   - Fechas y números localizados

7. Email Notifications:
   - Nodemailer o SendGrid
   - Email al registrar participante
   - Email con QR code
   - Recordatorios de evento
   - Confirmación de acreditación

8. Dashboard Público:
   - Estadísticas en vivo sin autenticación
   - Para mostrar en pantallas del evento
   - Acreditaciones en tiempo real
   - Gráficos animados

9. Mobile App (PWA):
   - Service Workers
   - Offline support
   - Add to Home Screen
   - Push notifications

10. Analytics:
    - Google Analytics o Mixpanel
    - Track eventos importantes
    - User behavior
    - Performance metrics
```
