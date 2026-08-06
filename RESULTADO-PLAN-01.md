# Plan 01 — Regresiones del Bloque A · resultado

**Fecha:** 2026-08-06 · **Rama:** `remediacion/bloque-a` · **Base:** `fd1838f`

**Estado: las cuatro fases CERRADAS y commiteadas.** Cada una verificada W3 en los dos
sentidos contra una instancia real (`next start`, build de producción, puerto 3100) y
consultada en PostgreSQL, no por el código de estado. El «antes» de cada fase se obtuvo
**revirtiendo su propio diff y reconstruyendo**, no razonando sobre el código.

| Fase | Commit | Qué cerró |
|---|---|---|
| 1 | `0fd0130` | El cupo de invitados valía 0 por defecto y descartaba todos los acompañantes |
| 2 | `5a84ed8` | El registro público escribía sobre participantes ya inscritos |
| 3 | `397bfa6` | Topes de longitud que rechazaban datos legítimos con 400, y uno que daba 500 |
| 4 | `63e30d4` | El 500 de `scheduleIds`, que seguía abierto veinte líneas más arriba |

W7 comprobado tras cada fase: **6 suites fallidas / 6 / 0 tests**. La línea base de
SB-11 no se movió en ningún momento. `npx tsc --noEmit` y `npm run build` limpios.

> **Por qué este fichero está en la raíz y no en `planes/resultados/`.** Ese directorio
> está en `.gitignore` a propósito: recoge los artefactos de las tandas nocturnas, que
> no se versionan. Este informe no es un artefacto de tanda, es **el entregable del
> plan**, y tiene que viajar con el repositorio para que el trabajo se pueda retomar en
> otra máquina.
>
> Las verificaciones que lo respaldan son ejecutables y están en
> [`scripts/w3-plan-01/`](scripts/w3-plan-01/README.md).

---

## Lo que hay que saber, más allá de que esté hecho

### 1. El crítico independiente NO llegó a correr

El método de `planes/README.md` exige un **agente crítico con contexto limpio** que
reciba el diff real y decida `cerrar` o `rehacer`. Se lanzó al terminar la fase 1 y
**la llamada fue rechazada**; después se dio indicación de continuar.

En su lugar se ejecutaron a mano las comprobaciones más peligrosas que ese crítico
tenía encargadas, y las dos salieron bien:

- **¿Editar un evento que tiene 0 a propósito se lo pisa a 2?** No.
  `updateEventSchema = createEventSchema.partial()` suprime el `.default()`. Medido:
  `PUT` sin el campo → `undefined` (el 0 guardado sobrevive); `PUT` con 0 → `0`;
  `POST` sin el campo → `2`.
- **¿Todos los caminos que crean invitados fijan `registrationSource`?** Sí, y los que
  no lo fijan es correcto que no lo hagan: `guestService.createGuest` (alta desde el
  panel) cae en el defecto `MANUAL`, que es justo lo que D1.2 quiere — invitado creado
  por el organizador, no consume cupo del asistente.

**Sigue faltando la revisión independiente de las fases 2, 3 y 4.** Es la garantía que
el método compra y aquí no se ha comprado.

### 2. Hallazgo fuera de alcance: SB-27

`GET /api/public/events/[slug]` **devuelve 500 siempre**. El `include` no pasa el alias
de la asociación (`as: 'schedules'`), Sequelize lo rechaza y el `catch` lo tapa.
Comprobado ejecutándolo. **No lo llama nadie**: la landing hace su propia consulta y sí
pasa el alias. Es una ruta pública muerta que solo sabe devolver 500 — anotado en
`SECURITY-BACKLOG.md`, sin tocar (W2).

Es anterior a este trabajo y ningún test lo cubre: exactamente el hueco de SB-11.

### 3. Rectificación al plan (gana el código)

El plan dice que con 50 invitados «el esquema los corta en 20». **No los corta**: el
`.max(20)` de Zod **rechaza la petición entera con 400**. El resultado exigido —que no
se creen 50 filas— se cumple, pero por rechazo, no por recorte.

También aparecieron **tres 500 distintos** en la fase 4, no uno: además de
`scheduleIds:["x"]`, fallaban `scheduleIds:[123]` y el mismo caso en **modo abierto**.
Los dos últimos no estaban en el plan.

Y la fase 3 tenía un cuarto camino sin nombrar: `participantSchema` no acota
`dietaryComments`, así que el **modo abierto** llegaba al mismo 500 por su lado. Se
corrigió en `publicRegistrationSchema`; los caminos de administración quedan para el
plan 04 (F4-03).

### 4. Lo que NO se pudo verificar ejecutando

**El contenido del correo de confirmación.** EmailJS se dispara desde el cliente y los
eventos de prueba no tienen plantilla asociada, así que el envío no llega a ocurrir. Lo
verificado es el dato del que ahora depende —`guestsCreated` en la respuesta— y que el
nombre solo se añade si el servidor confirmó la fila. **El texto final del correo no se
ha visto salir.** Era el síntoma que abría el plan («el correo miente al asistente»), y
queda comprobado por construcción, no por observación.

### 5. Detalle del entorno que costó tiempo y conviene heredar

La landing pública **no se puede pilotar desde el panel de vista previa**: no compone
fotogramas, así que `requestAnimationFrame` nunca dispara y **React no hidrata**. La
página se ve en blanco y parece rota sin estarlo — pasa igual en `next dev` y en
`next start`, y con eventos que no toca este trabajo.

Se resolvió instalando un sustituto de `requestAnimationFrame` antes de interactuar:

```js
window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
window.$RT = performance.now();
```

Con eso hidrata y el formulario se puede recorrer entero. También: `innerText` devuelve
vacío en ese panel porque depende de maquetación — hay que leer `textContent`.

---

## Decisiones registradas

Todas en [DECISIONES.md](planes/DECISIONES.md) con su alternativa descartada: **D1.1** a
**D1.4** (fase 1), **D2.1** (fase 2), **D3.1** (fase 3) y **D4.1** (fase 4).

La que más conviene mirar es **D2.1**, porque cierra una puerta que antes estaba
abierta: un participante ya inscrito **ya no recibe invitados nuevos** de una petición.
El plan nombraba dos escrituras y esta era una tercera. Si el caso «me inscribo a una
segunda fecha y llevo acompañante» resulta necesario para el producto, hay que reabrirlo
a propósito — hoy la respuesta lo declara como no guardado y la pantalla lo dice.

Y **D3.1**: la columna `dietary_comments` **no** se amplió a TEXT. D1.5 lo permitía,
pero la verificación que el propio plan exige («comentario de 300 → 400») quedaría
contradicha si 300 se guardara.

---

## Banco de pruebas

Los `scripts/seed-r10*-fixtures.ts` reproducen los escenarios. **Solo insertan**: crean
eventos nuevos con sufijo de tiempo en cada ejecución, no borran ni recrean nada, y se
pueden correr las veces que haga falta. `scripts/migrate-guest-source.ts` añade la
columna de la fase 1 y es idempotente (`ADD COLUMN IF NOT EXISTS`), segura en producción.

**Aviso al reutilizarlos**: una batería puede modificar los datos de otra. La prueba
legítima de la fase 4 renombra al participante que la fase 3 busca por apellido. Sembrar
de nuevo antes de cada batería en lugar de reaprovechar.
