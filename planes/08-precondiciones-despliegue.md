# Plan 08 — Precondiciones de despliegue: lo que hoy fallaría al llegar al droplet

> **Ejecutar antes que el plan 07.** Aquí está lo que hace que la reconstrucción falle o, peor,
> **parezca correcta sin serlo**. Dos de estos fallos los introdujo la validación de entorno de
> A10: exige variables cuyo efecto real no consigue.

**Origen:** revisión de despliegue sobre `41eb4da` y `25d6eba`, con verificación **en los
artefactos compilados** (`.next/routes-manifest.json`, chunks de servidor y cliente), no en el
código fuente. Ese método es el que descubrió D1 y D2.

---

## Fase 1 — La validación de entorno certifica cosas que no consigue

### D1 — `ALLOWED_ORIGIN` está congelada como `*` en el build

`next.config.js:27` se evalúa **durante `next build`** y su resultado se serializa. Comprobado en el
build actual:

```
.next/routes-manifest.json → {"source":"/:path*","key":"Access-Control-Allow-Origin","value":"*"}
```

En ejecución, `next start` sirve las cabeceras **del manifiesto**, no del config. Es decir: aunque
`ALLOWED_ORIGIN` esté correctamente puesta en el `EnvironmentFile`, **todas las páginas salen con
`Access-Control-Allow-Origin: *`** junto a `Access-Control-Allow-Credentials: true`. Eso es F2-04
intacta, y `src/lib/env.ts:41-45` exige la variable dando a entender que el problema está resuelto.

El middleware (`security.ts:3`) **sí** lee la variable en ejecución, pero solo cubre `/api/:path*`.

**Qué hacer:** decidir entre cargar el entorno también en el `npm run build` o —mejor y ya pedido
por §7.4— **retirar las cabeceras CORS de `next.config.js` y dejar el middleware como única
fuente**. Hoy están duplicadas en dos sitios que no dicen lo mismo, que es SB-02.

### D2 — Las tres `NEXT_PUBLIC_*` no se pueden configurar al desplegar

`NEXT_PUBLIC_*` se **inlinea en tiempo de build**. Comprobado: el bundle contiene el literal
`confirmaciones@grupolocastillo.com` y `grep NEXT_PUBLIC_MODIFY_CONTACT_EMAIL .next/server` da cero
coincidencias. Ponerla en el `EnvironmentFile` **no cambia nada** — ni en los cinco componentes
cliente ni en la ruta de servidor que la usa.

Es decir: el cierre de F6-10 del commit `03a2ad1` funciona en desarrollo y **no** en el despliegue
previsto. Lo mismo vale para las dos `NEXT_PUBLIC_EMAILJS_*`.

**Qué hacer:** documentar en `.example.env` que esas tres son **de build**, y que cambiarlas exige
recompilar y redesplegar. Si se quiere que el correo de contacto sea configurable en caliente, hay
que servirlo desde el servidor, no desde una constante de bundle. **Decidir cuál de las dos vías** y
dejarlo escrito.

### D3 — La plantilla trae `NODE_ENV="development"`

`.example.env:23`. `next start` **respeta** el `NODE_ENV` heredado. Con `development`, la validación
deja de exigir `ALLOWED_ORIGIN`, `UPLOADS_DIR`, la longitud de los secretos y los tiempos de
expiración — y `sequelize.ts:17` enciende el **log de SQL**, que manda credenciales y PII a
journald.

El commit anterior añadió una advertencia en comentario pero **dejó puesto el valor peligroso**. Y
la forma natural de preparar el build es `set -a; . /etc/tuacreditacion.env`, con lo que el propio
`next build` se ejecutaría en modo desarrollo.

**Qué hacer:** que la plantilla diga `production`. El desarrollo local ya lo sobrescribe con su
propio `.env`.

### Verificación exigida
- Build con el entorno cargado → `routes-manifest.json` **no** contiene `"*"` (o ya no contiene la
  cabecera, si se retira de `next.config.js`).
- `curl -I` a una página pública → una sola cabecera CORS, con el origen real.

---

## Fase 2 — Lo que rompe el primer arranque y la primera subida

### D5 — El limitador necesita `CREATE TABLE`, y sin él degrada en silencio

`RateLimiterPostgres` lanza `CREATE TABLE IF NOT EXISTS rate_limits` **en el primer login**, no al
arrancar. §7.4 exige un usuario de base de datos sin SUPERUSER, y en PostgreSQL 15+ el esquema
`public` ya no concede `CREATE` a `PUBLIC`: el rol recibe *permission denied*.

> **Cambio del 2026-08-06:** la base pasa a ser la **administrada de DigitalOcean**, así que los
> permisos ya no se conceden con un `psql` local sino desde su consola o con el usuario que ella
> provee. Qué permisos trae el usuario por defecto y si conviene uno acotado lo responde la **fase 2
> del plan 07** (pregunta I4). El fallo que hay que evitar es el mismo: sin `CREATE`, el limitador
> **degrada a memoria en silencio** y la protección contra fuerza bruta queda decorativa.

Entonces `auth-rate-limit.ts:79-84` escribe un `console.error` y **degrada a memoria**, con lo que
la protección contra fuerza bruta queda decorativa y nada más lo señala.

**Qué hacer:** crear la tabla en el aprovisionamiento y conceder solo DML sobre ella
(`SELECT, INSERT, UPDATE, DELETE`; también hace falta DELETE porque `clearExpiredByTimeout` viene
activo por defecto), de forma que la aplicación **nunca necesite CREATE**. Y que esa degradación
deje de ser silenciosa: es un fallo de seguridad, no una nota de log.

### D6 — `UPLOADS_DIR` ni se crea ni se comprueba

La validación solo mira que sea absoluta. El directorio se crea **perezosamente en la primera
subida** (`api/uploads/route.ts:46`). Con `ProtectSystem=strict` y sin el directorio en
`ReadWritePaths=`, ese `mkdir` falla, se captura y sale como **HTTP 500 con `error.message`**, que
**filtra la ruta absoluta del sistema de ficheros al cliente** (violación de R2).

Y peor: `ReadWritePaths=` sobre una ruta que no existe hace **fallar el arranque** de la unidad —
que es exactamente la situación del primer despliegue.

**Qué hacer:** crear el directorio en el aprovisionamiento con propietario y modo correctos (Nginx
debe poder leerlo para el `alias`), usar `StateDirectory=` en systemd, comprobar la escritura en
`validateEnv()` para que el fallo aborte el arranque en vez de aparecer como un 500, y quitar
`error.message` de esa respuesta.

### D7 — La aplicación escucha en `0.0.0.0`

`next start` usa `-H 0.0.0.0` por defecto y **no lee `HOSTNAME`**. Pero `rate-limit.ts:36-38`
declara como requisito de despliegue que solo escuche en `127.0.0.1`: si no, la heurística del
último `x-forwarded-for` es falsificable y **el límite por IP se evade**.

**Qué hacer:** `-H 127.0.0.1` explícito, más el firewall. Y declarar `PORT` en la plantilla: es la
única variable que el inventario tiene realmente huérfana —no está declarada ni validada— y decide
a qué upstream apunta Nginx.

### D8 — `DATABASE_URL` malformada da un TypeError, no el mensaje de la validación

`env.ts` solo comprueba `min(1)`. Con `DATABASE_URL=acreditacion` (olvidar el esquema), Sequelize
lanza `TypeError: Cannot read properties of null` **en la primera petición**: el servicio arranca
"sano", systemd lo da por activo y el primer usuario recibe un 500 que no nombra la variable. Es el
modo de fallo que A10 decía cerrar.

**Qué hacer:** validar el formato (URL con protocolo `postgres:`/`postgresql:`) y valorar un
`authenticate()` en el arranque para que una base inalcanzable sea un arranque fallido. Documentar
que los caracteres especiales de la contraseña van percent-encoded.

### Verificación exigida
- Usuario de base de datos **sin** permiso de CREATE → el primer login **avisa de forma ruidosa**,
  no degrada callado.
- `ProtectSystem=strict` con el directorio creado → la subida funciona; sin él, **el arranque
  falla**, no la petición.
- `DATABASE_URL` sin esquema → **no arranca**, con mensaje que nombra la variable.

---

## Fase 3 — Higiene del repositorio antes de clonarlo en un servidor nuevo

### D12 — Hay un volcado con datos reales versionado *(hallazgo nuevo, no estaba en la auditoría)*

`acreditacion_dump.sql` está **rastreado por git**. Contenido contado sin imprimirlo: **6 usuarios
con sus hashes de contraseña, 110 refresh tokens, 360 registros de auditoría y 3 empleados con
RUT**.

La reconstrucción empieza por `git clone`, así que esos datos aterrizan en el droplet nuevo **y en
cada máquina de desarrollo**. Y es una tentación evidente usarlo para inicializar el esquema, lo
que repoblaría `refresh_tokens`: si alguien reutilizara `JWT_REFRESH_SECRET`, esos 110 tokens
serían **válidos**.

La Fase 2 de la auditoría concluyó que el historial estaba limpio de secretos. Este fichero no es
un `.env`, por eso no lo detectó — pero contiene credenciales hasheadas y datos personales.

**Qué hacer:** sacarlo del árbol, decidir si merece reescritura de historia (el repositorio es
público), y que el esquema venga de migraciones. Registrar como entrada nueva de backlog.

### D4 — `npm run db:sync` destruye la base de datos

`package.json:13` apunta a **`src/scripts/sync-db.ts`**, y es *ese* fichero el que tiene
`sync({ force: true })` en su línea 15. No hay migraciones. La variante no destructiva
(`alter: true`) está en **`scripts/sync-db.ts:29`** — otro fichero distinto, sin script npm: la
peligrosa es la que tiene atajo y la segura la que no.

En el droplet, un `npm run db:sync` por costumbre **borra los datos de producción**.

**Qué hacer:** que `db:sync` apunte a la variante `alter` o exija confirmación explícita, e
introducir migraciones antes de la reconstrucción.

### D11 — Lo que §7.4 pide y sigue sin existir

Sin `engines.node`, sin `.nvmrc`, **sin `.github/` en absoluto** (ni Dependabot ni `npm audit` en
CI), sin `poweredByHeader: false`, cabeceras aún duplicadas, y ni la unidad systemd ni la
configuración de Nginx versionadas. Es el contenido de la fase 1 del plan 07.

### Verificación exigida
- `git ls-files` no devuelve ningún fichero con datos reales.
- `npm run db:sync` sobre una base con datos **no** los borra sin una confirmación explícita.

---

## Decisiones de producto — se toman, no se preguntan

Se registran en [DECISIONES.md](DECISIONES.md) y el crítico las evalúa.

| # | Decisión | Valor por defecto | Razonamiento |
|---|---|---|---|
| D8.1 | El correo de contacto, ¿de build o configurable en caliente? | **De build, documentado** | Servirlo desde el servidor para hacerlo dinámico es trabajo real por un valor que cambia una vez al año. Basta con que `.example.env` diga que las tres `NEXT_PUBLIC_*` **exigen recompilar** |
| D8.2 | Fuente única de CORS | **El middleware**, retirando las cabeceras de `next.config.js` | Las del config se evalúan en build y hoy están congeladas como `*`. Es además lo que §7.4 ya pedía (SB-02) |
| D8.3 | `NODE_ENV` en la plantilla | **`production`** | La plantilla es para el servidor; el desarrollo local ya la sobrescribe con su propio `.env`. Dejar `development` con una advertencia en comentario es lo que hay ahora y **no funciona** |
| D8.4 | Permisos de base de datos para `rate_limits` | **Crear la tabla en el aprovisionamiento**, y a la aplicación solo DML | Así nunca necesita `CREATE`, que PostgreSQL 15+ no concede por defecto. Y la degradación silenciosa a memoria pasa a ser imposible en vez de improbable |
| D8.5 | `npm run db:sync` destructivo (SB-26) | **Apuntarlo a la variante `alter`** y dejar la destructiva tras una confirmación explícita | Hoy la peligrosa tiene atajo y la segura no. Invertirlo es una línea |
| D8.6 | `PORT` | **Declararla y validarla** | Es la única variable realmente huérfana del inventario, y decide a qué upstream apunta Nginx |

**No se decide solo — se propone y se espera:**

1. **Reescribir la historia de git** para eliminar `acreditacion_dump.sql` (SB-25). Es irreversible,
   invalida todos los clones existentes y **no borra lo que ya se haya copiado** de un repositorio
   público. Lo que sí se hace sin preguntar es **dejar de rastrearlo** y añadirlo a `.gitignore`.
2. **Rotar las contraseñas de los seis usuarios del volcado.** Sus hashes están publicados; son
   bcrypt con coste 12, así que no es urgente, pero es decisión de Emmanuel y afecta a personas.
