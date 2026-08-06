# Plan 03 — Bloque B: sesión y cliente

Lo que rompe la experiencia de sesión sin ser un agujero de seguridad. Va antes que el resto del
Bloque B porque **SB-17 se manifiesta justo en las pantallas de más tráfico**.

**No bloquea el redespliegue.** Ejecutable después de salir a producción.

---

## Fase 1 — SB-17: la doble cabecera `Authorization` cierra sesiones sin motivo

`apiClient.ts:25` construye las cabeceras y `:27` añade el token con **`append`**, no con `set`.
Ante un 401, `:58` pone el token nuevo y `:60` reinyecta el mismo objeto en la llamada recursiva.
En la segunda vuelta `:27` vuelve a hacer `append`:

```
Authorization: Bearer <token>, Bearer <token>
```

`auth.ts:26` hace `authHeader.split(' ')[1]` → token basura → **401** → nuevo refresh → **recursión
sin cota**, porque la llamada recursiva es una invocación nueva con los valores por defecto.

**No se dispara con un token válido**, así que no aparece en pruebas cortas: se manifiesta en la
primera sesión que caduque **durante el uso**. El síntoma es un cierre de sesión inexplicable o un
bucle, justo en padrón y acreditación.

**Qué hacer:** `set` en lugar de `append`, no reenviar la cabecera previa en el reintento, y acotar
la profundidad de recursión.

**Verificación (W3):** forzar la caducidad (token de vida corta), usar la aplicación hasta que
refresque y comprobar que la segunda petición lleva **una sola** cabecera `Authorization` y que la
sesión sigue viva. Sin esto no está verificado: es el caso que las pruebas cortas no ven.

---

## Fase 2 — SB-20: un 403 se presenta al usuario como «no hay resultados»

`apiClient.ts:71-80` contempla 401, 404 y 422; **el 403 cae en el `default`** y se degrada a un
error genérico indistinguible de un 500. Y `participantStore.ts:89-92` **captura el error y
devuelve `[]`**, con lo que `SearchParticipant` muestra **«No se encontraron resultados»**.

Un fallo de permisos se presenta como un padrón vacío. Es la razón por la que un recorte de roles
en estos endpoints sería **invisible**: no falla ruidosamente, falla en silencio.

**Qué hacer:** `case 403` con mensaje propio, y que la búsqueda distinga «sin resultados» de
«fallo». Aprovechar para revisar el resto de mensajes: la landing pública muestra hoy
`"Validation error"` en inglés y, bajo un 429, un `Unexpected token 'T'` porque intenta parsear
como JSON una respuesta de texto plano.

**Verificación (W3):** provocar un 403 real con un rol sin permiso → el usuario ve un mensaje que
dice que no tiene permiso. Provocar un 429 → mensaje legible, no un error de parseo.

---

## Fase 3 — F3-06 y F3-07: logout sin autenticación y health que habla de más

**F3-06** — `/api/auth/logout` **no exige autenticación** y revoca cualquier refresh token que
venga en el cuerpo. Tampoco tiene limitador propio. No es adivinable, pero es la escritura en base
de datos no autenticada con el límite más laxo de todas las rutas de auth.

**Qué hacer:** exigir autenticación y validar que el token revocado pertenece a quien lo pide.

**F3-07** — `/api/health` devuelve detalles internos sin autenticación. Que devuelva solo un estado;
los detalles, tras autenticación.

**Verificación (W3):** logout con el token de otro usuario → rechazado. Logout legítimo → funciona.
`/api/health` sin credenciales → estado escueto.

---

## Preguntas abiertas

1. ¿La aplicación debe tener un endpoint de salud **para Nginx y systemd**? Hoy no hay ninguno
   utilizable como `ExecStartPost`, y el plan 07 lo necesita. Puede que F3-07 no sea «recortar» sino
   «rehacer»: uno público y escueto para la sonda, y otro autenticado con detalle.
2. La cota de recursión de SB-17, ¿cuántos reintentos? Uno solo es lo razonable, pero conviene
   confirmarlo contra el flujo real de caducidad.
