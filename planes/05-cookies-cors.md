# Plan 05 — Bloque B: cookies `httpOnly` y CORS (las dos mitades del mismo cambio)

> **Este plan tiene una dependencia que no se puede romper.** F3-08 y F2-04 se corrigen **juntas o
> en este orden, nunca F3-08 sola**: migrar los tokens de `localStorage` a cookies `httpOnly`
> **activa** la explotabilidad del CORS reflejado, que hoy es inofensivo **precisamente porque** no
> hay cookies. Corregir F3-08 aislada **convierte un hallazgo inofensivo en uno explotable**.

**No bloquea el redespliegue.** Va al final del Bloque B por su acoplamiento y su superficie.

---

## Fase 1 — F2-04: cerrar el CORS reflejado, ANTES de tocar las cookies

Hoy hay **dos** fuentes de cabeceras CORS que no dicen lo mismo:

- `next.config.js:27` → `process.env.ALLOWED_ORIGIN || "*"`, evaluado **en build** y hoy congelado
  como `*` en el manifiesto (ver plan 08, D1).
- `src/middleware/security.ts:3` → mismo respaldo `['*']`, pero evaluado **en ejecución** y solo
  para `/api/:path*`.

Ambas van acompañadas de `Access-Control-Allow-Credentials: true`, que es lo que vuelve peligrosa
la combinación en cuanto existan cookies.

**Qué hacer:**
1. **Una sola fuente** (SB-02). Retirar las cabeceras CORS de `next.config.js` y dejar el
   middleware, o al revés — pero una sola, y que cubra lo que tiene que cubrir.
2. **Retirar el respaldo `'*'`.** Sin `ALLOWED_ORIGIN` la aplicación no debe servir CORS permisivo:
   la validación de arranque ya exige la variable en producción, así que el respaldo solo puede
   dispararse por error.
3. Verificar que el origen reflejado se compara contra la lista, no se devuelve tal cual.

**Verificación (W3):** petición con `Origin` no autorizado → **sin** cabecera de permiso. Con el
origen legítimo → responde. Comprobado en una página **y** en una ruta de API, porque hoy se sirven
desde sitios distintos.

---

## Fase 2 — F3-08: tokens a cookies `httpOnly`

Solo cuando la fase 1 esté cerrada y verificada.

Los tokens viven hoy en `localStorage`, accesible desde JavaScript: cualquier XSS los lee. Las
cookies `httpOnly` no.

**Qué hacer:** emitir las cookies con `httpOnly`, `Secure`, `SameSite=Lax` (o `Strict`, decidiendo
si rompe algún flujo), y adaptar `apiClient` y `authStore` para que dejen de manejar el token a
mano. Revisar el efecto sobre el refresco automático y sobre SB-17.

**Lo que hay que vigilar:** con cookies, el navegador las envía **solas** en cada petición de mismo
origen. Eso abre la puerta a CSRF, que hoy no existe porque el token va en una cabecera que un
formulario ajeno no puede poner. `SameSite` cubre la mayoría de los casos, pero hay que
comprobarlo, no suponerlo — y decidir si hace falta un token anti-CSRF.

**Verificación (W3):** login → la cookie llega con las tres marcas; `document.cookie` **no** la ve;
la aplicación funciona entera; una petición desde otro origen con credenciales **no** pasa.

---

## Preguntas abiertas

1. ¿`SameSite=Strict` o `Lax`? Strict es más seguro y puede romper la vuelta desde un enlace
   externo — hay que mirar si algún flujo (correo de confirmación, landing) depende de ello.
2. Con cookies, ¿sigue teniendo sentido el refresco automático por temporizador de
   `authStore.ts:132`? Puede simplificarse, y eso interactúa con SB-17 y con el límite del plan 02.
3. ¿Hace falta protección CSRF explícita o basta `SameSite`? Depende de si algún endpoint acepta
   navegación de terceros.
