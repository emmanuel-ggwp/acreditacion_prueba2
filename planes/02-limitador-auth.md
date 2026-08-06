# Plan 02 — El limitador: bloqueo de cuentas, puerta caída y CPU regalada

> **Bloquea el despliegue.** Los tres fallos los introdujo la propia remediación (`efa61a2` y
> `33fd4f1`). Dos de ellos **tumban la acreditación en puerta**, que es el caso de uso crítico del
> producto: uno deja fuera a cualquier cuenta y el otro a toda una sede.

**Origen:** dos revisiones adversariales independientes, una sobre el limitador y otra sobre
regresiones funcionales, que coinciden en el diagnóstico por caminos distintos.

---

## Fase 1 — Cualquiera puede dejar fuera a cualquier cuenta, indefinidamente

**El más grave. Es un DoS no autenticado contra personas concretas.**

### Qué pasa

`auth-rate-limit.ts:27-29` define el cubo por cuenta con `blockDuration: 900`, y la clave es un
valor **que elige quien ataca**: el email del cuerpo de la petición.

1. Once peticiones a `/api/auth/login` con el email de la víctima y cualquier contraseña.
2. Al agotar los puntos, la clave `account:<email>` queda **bloqueada 900 segundos**.
3. La víctima teclea su contraseña correcta → `login/route.ts:20-23` devuelve **429 antes** de
   llegar a `authService.login`, así que `resetAccountRateLimit` **nunca se ejecuta**.

No hay autodesbloqueo ni ningún otro camino de reset en todo el proyecto. **Once peticiones cada
quince minutos mantienen una cuenta fuera para siempre**: 44 peticiones/hora por víctima, mientras
el cubo de IP permite 240/hora. Una sola IP mantiene cinco cuentas bloqueadas de forma permanente.

Los emails del personal son conocidos y están en los volcados del proyecto. **Con dos IPs cae toda
la plantilla de acreditación durante el evento entero.**

Es exactamente el desenlace que el commit decía evitar, movido de granularidad IP a granularidad
cuenta. La verificación de aquel commit no podía detectarlo: medía el ataque desde el punto de
vista del atacante y nunca comprobó **si la víctima legítima podía seguir entrando**.

### Qué hacer

El patrón correcto tiene dos piezas, y hay que razonar ambas antes de escribir código:

1. **Consumir la cuota solo cuando el intento FALLA.** Quien acierta la contraseña entra aunque
   haya cuota gastada. Esto elimina el bloqueo del legítimo de raíz, no lo mitiga.
2. **Que la clave incluya algo que el atacante no controla**, típicamente `(email, ip)`. Así quien
   ataca se bloquea a sí mismo desde su origen, no a la víctima desde el suyo.

Comprobar el límite **antes** de verificar la contraseña (para no gastar CPU cuando ya está
agotado) pero **consumirlo después** y solo en el camino de fallo. `rate-limiter-flexible` expone
`get()` para consultar sin consumir; leer su API real antes de asumirla.

**Trade-off que hay que declarar en el informe:** con clave `(email, ip)`, un atacante con muchas
IPs recupera intentos por IP. Es el compromiso estándar y se acepta a cambio de eliminar el DoS,
pero la decisión debe quedar escrita, no implícita.

### Verificación exigida (W3)

- Atacante agota la cuota contra `admin@…` desde su IP → **el administrador entra sin problemas
  desde otra IP con su contraseña correcta**. Ésta es la prueba que faltaba.
- El atacante, desde su IP, sí queda cortado.
- Fuerza bruta desde una IP contra una cuenta: sigue bloqueándose.
- Un usuario que falla tres veces y acierta a la cuarta: entra, y su cuota vuelve a cero.

---

## Fase 2 — El límite general de 120/min tira la acreditación en puerta

**Depende de la fase 1** (mismo subsistema).

### Qué pasa

`rate-limit.ts:16-19` pasó de `1000 puntos / 6 s` (~166 req/s) a `120 / 60 s`. Es una reducción de
**80×** aplicada por `middleware.ts:7` a **todo** `/api/*`, y se calibró a ojo.

La aritmética real de una acreditación: búsqueda con debounce (1-3 peticiones) + `verify` (1) +
`verify` por invitado (N) + `POST /api/accreditations` (1+N) + `getLastAccreditation` (1) +
estadísticas y horarios (3) ≈ **10-14 peticiones por persona acreditada**.

A tres personas por minuto y puesto son ~36 req/min por operador. **Cuatro puestos tras el NAT de
la sede superan los 120/min** y empiezan a recibir 429 en mitad del evento.

Y encadena: `/api/auth/refresh` está protegido por este mismo cubo, `apiClient.ts:52` refresca ante
cualquier 401 y `authStore.ts:89` hace `logout()` si el refresh falla ⇒ **cierre de sesión masivo**,
y la vuelta al login topa con el cubo de IP.

### Qué hacer

Recalcular el umbral **a partir del coste real medido** de una acreditación, no de una intuición.
Contar las peticiones que dispara el flujo completo en el navegador y dimensionar para el caso
peor razonable (número de puestos × ritmo en hora punta), con margen.

Considerar además que el límite general por IP es la herramienta equivocada para este tráfico:
está identificando a **una sede entera** como si fuera un cliente. Evaluar excluir del cubo general
las rutas del flujo de acreditación autenticado, o distinguir tráfico autenticado de anónimo — y
**justificar la elección**, porque relajar un límite tras un compromiso necesita argumento.

### Verificación exigida (W3)

- Simular el flujo de acreditación completo de **cuatro puestos durante cinco minutos** desde la
  misma IP → cero 429.
- Un barrido anónimo desde esa misma IP → sí se corta.
- Comprobar explícitamente que `/api/auth/refresh` no devuelve 429 bajo ese tráfico legítimo.

---

## Fase 3 — Robustez del limitador

Tres defectos menores pero reales, todos verificados contra `rate-limiter-flexible@9.0.0`.

### a) Fail-open con claves largas

`rate_limits.key` es `varchar(255)` y la clave es `account:<email>`. `loginSchema`
(`authSchemas.ts:6`) **no tiene `.max()`**: un email de 252 caracteres pasa la validación y produce
una clave de 260. Postgres responde `22001 value too long` → el error se absorbe en el
`insuranceLimiter` → **la petición se permite**. Además cada clave sobredimensionada se queda en
`MemoryStorage`, que no tiene tope ni LRU.

Corregir acotando la clave (truncar o hashear) **y** poniendo `.max()` en el email.

### b) La degradación a memoria es permanente

`auth-rate-limit.ts:79-84`: si `_createTable()` falla, el callback fija el limitador de memoria y
**no se reintenta nunca**. Es el caso normal de un arranque en frío donde la aplicación levanta
antes que PostgreSQL: el limitador se queda en memoria para toda la vida del proceso, y con ello
deja de ser compartido y de sobrevivir a reinicios — justo lo que el módulo dice garantizar.

Permitir el reintento, o crear la tabla en `sync-db.ts` y pasar `tableCreated: true`.

### c) Normalización de email inconsistente

El cubo usa `email.trim().toLowerCase()` pero `authService.ts:14` busca al usuario con **igualdad
exacta** sobre una columna sensible a mayúsculas, y ninguna ruta de alta normaliza
(`userService.ts:27,32`, `authService.ts:69`). Dos usuarios que difieran solo en mayúsculas
comparten cubo. Con el rediseño de la fase 1 el impacto baja mucho, pero **la inconsistencia sigue
ahí**: decidir si se normaliza en escritura (recomendado) y anotarlo.

### Verificación exigida (W3)

- Email de 250 caracteres → la petición **se limita**, no se cuela.
- Arrancar la aplicación con PostgreSQL caído, levantarlo después → el limitador **vuelve** a usar
  la base de datos.
- Los umbrales siguen aplicándose tras el reintento.

---

## Decisiones de producto — se toman, no se preguntan

Se registran en [DECISIONES.md](DECISIONES.md) y el crítico las evalúa.

| # | Decisión | Valor por defecto | Razonamiento |
|---|---|---|---|
| D2.1 | Umbral del límite general por IP | **600/min**, y **medir antes de fijarlo** | Seis puestos × 3 personas/min × ~14 peticiones ≈ 250/min. El doble deja margen para picos sin volver al 166 req/s original, que era no limitar. **El número real sale de contar las peticiones del flujo en el navegador**, no de esta estimación: si la medición dice otra cosa, gana la medición |
| D2.2 | Clave del cubo de credenciales | **`(email, ip)`** | Es lo que elimina el DoS de cuenta: quien ataca se bloquea a sí mismo desde su origen. Cede terreno ante fuerza bruta distribuida, que necesita una botnet — compromiso estándar y aceptado |
| D2.3 | ¿Cuándo se consume la cuota? | **Solo cuando el intento falla** | Quien acierta la contraseña entra aunque tenga cuota gastada. Elimina el bloqueo del usuario legítimo de raíz en vez de mitigarlo, y de paso hace que el tráfico legítimo de una sede no gaste nada |
| D2.4 | ¿El límite general debe cubrir el flujo de acreditación autenticado? | **Separar tráfico autenticado del anónimo** | Un límite por IP identifica a **una sede entera** como si fuera un cliente. El tráfico anónimo sí se corta duro; el autenticado, con un umbral propio y holgado. Si separar resulta más caro de lo previsto, subir el umbral general y **registrar la deuda** |
| D2.5 | `/api/auth/logout` sin autenticación ni límite (F3-06) | **Adelantarlo a este plan** | Es la única ruta de auth que queda fuera, cuesta poco y dejarla para el plan 03 significa tocar el mismo subsistema dos veces |
| D2.6 | Política de contraseñas partida en dos | **Unificar a la más estricta** (8 caracteres, 4 clases) | `POST /api/users` pide hoy 6 sin complejidad mientras `registerSchema` pide 8 con 4 clases. Cualquier límite de intentos protege menos de lo que aparenta si el otro camino admite contraseñas débiles. **Afecta solo a altas nuevas**; no invalida las existentes |

**No se decide solo:** forzar el cambio de las contraseñas ya existentes. Se propone y se espera —
es un cambio que el usuario final nota y que no se puede deshacer.
