# Plan 07 — Reconstrucción del droplet, versionada y reproducible

> El servidor anterior se perdió **sin snapshot y sin un solo fichero de configuración
> versionado** (F6-01). Por eso no hay línea base contra la que comparar, no se sabe qué cambió la
> redirección de dominio y no se sabe siquiera con qué versión de Node corría. Este plan existe
> para que eso no pueda repetirse: **todo lo que define el servidor vive en el repositorio**, y un
> cambio no autorizado se convierte en un `git diff`.

## Advertencia sobre el alcance de lo que se puede automatizar

Un script de aprovisionamiento se puede escribir entero, y este plan lo hace. Lo que **no** se
puede es darlo por bueno sin ejecutarlo: no hay droplet contra el que probarlo, y un script de
infraestructura no verificado es una hipótesis con aspecto de certeza — exactamente el modo de
fallo que la auditoría documenta una y otra vez.

De ahí la forma del plan: **las fases 1 a 4 corren de noche** —investigar, escribir, validar en seco
lo validable en seco (sintaxis, idempotencia, `nginx -t` en contenedor)— y **la fase 5, que es
ejecutar contra el droplet real, es supervisada**.

**La fase 2 es investigación pura y no toca nada**: existe porque el 2026-08-06 se decidió usar la
base **administrada de DigitalOcean** en vez de PostgreSQL en el droplet, y ese cambio dejó el plan
sin los datos que el script necesita. Se documenta primero, se escribe después.

**Los secretos no entran nunca en el repositorio ni en el script.** El script consume un fichero
de entorno que se genera en la máquina y nunca se versiona. Ningún agente debe imprimir su
contenido (regla R2 de la auditoría).

---

## Fase 1 — Fijar el runtime y automatizar las actualizaciones

Es lo más barato de todo el plan y es **la medida de mayor impacto del informe entero**: es lo que
habría avisado del salto 16.0.6 → 16.0.7 y habría cerrado la ventana de siete meses que acabó en
el compromiso.

1. **`engines.node`** en `package.json` y **`.nvmrc`** con la misma versión. Hoy no consta con qué
   Node corría el servidor comprometido. Elegir una LTS con soporte largo y **justificar cuál**.
   **Dato verificado el 2026-08-06:** el Node instalado en la máquina de desarrollo es **v24**,
   mientras que D7.5 («la LTS activa») apunta a **22**. Next 16.2.12 exige `>=20.9.0`, así que las
   dos valen — pero fijar una versión distinta de la que se usa a diario es una decisión a tomar y
   registrar, no a asumir.
2. **`.github/dependabot.yml`** para npm, con agrupación de parches para que no genere ruido
   inmanejable.
3. **`npm audit` en CI** como paso que falla ante vulnerabilidades críticas.

**Requisito previo, y es duro:** SB-16 y SB-13 deben estar resueltas **antes** de este punto. Con
`legacy-peer-deps=true` global, Dependabot y `npm audit` se estrenan ciegos a los conflictos de
peer dependencies — montar la contramedida principal con ese punto ciego incorporado desde el
primer día repite el patrón que el informe existe para romper.

**Estado verificado el 2026-08-06:** `.npmrc` sigue con `legacy-peer-deps=true` y **`.github/` no
existe**, así que el requisito previo está **sin resolver** y la fase 1 arranca por ahí, no por
`.nvmrc`. SB-13 también confirmado en el árbol real: `node_modules/postcss` está en 8.5.6 mientras
`node_modules/next/node_modules/postcss` sigue en **8.4.31**.

### Verificación
`node --version` coincide con `.nvmrc`; `npm ci` funciona en limpio; el fichero de Dependabot pasa
el validador de GitHub.

---

## Fase 2 — Investigar la base administrada de DigitalOcean

**Existe porque el cambio del 2026-08-06 dejó el plan sin datos, y el script de la fase siguiente no
se puede escribir sin ellos.** Nada de esto se supone: se busca en la documentación oficial de
DigitalOcean y se contrasta con la consola del proyecto. Lo que no se pueda confirmar sale como
pregunta para Emmanuel, no como valor por defecto inventado.

### Qué hay que averiguar

| # | Pregunta | Por qué bloquea |
|---|---|---|
| I1 | **La CA**: ¿cómo se obtiene el certificado de la base, en qué formato, y cómo se le pasa a Node? ¿`dialectOptions.ssl.ca` con el contenido, una ruta de fichero, o `NODE_EXTRA_CA_CERTS`? | Sin esto, `rejectUnauthorized: true` **impide arrancar**. Decide la variable nueva y cómo la valida `env.ts` |
| I2 | **La cadena de conexión**: ¿qué formato exacto da DigitalOcean? ¿Necesita `?sslmode=require` o `sslmode=verify-full`? ¿Interfiere con lo que Sequelize ya hace con `dialectOptions`? | `DATABASE_URL` mal formada hoy da un `TypeError` opaco en la primera petición (plan 08, D8) |
| I3 | **Límite de conexiones** del plan contratado, y cómo se reparte entre la aplicación y el pool del limitador | `pool.max: 5` se fijó contra una base local. Agotar el límite de la administrada tumba la aplicación entera, no una consulta |
| I4 | **Usuario y permisos**: ¿el usuario por defecto vale, o conviene uno acotado? ¿Tiene `CREATE` en el esquema `public`? | El limitador crea `rate_limits` en el primer login; sin `CREATE` **degrada a memoria en silencio** |
| I5 | **Red**: cómo se restringe el acceso para que solo el droplet alcance la base (*trusted sources*), y qué pasa con el acceso desde la máquina de desarrollo | Sustituye al `127.0.0.1` que se pierde al externalizar |
| I6 | **Copias de seguridad**: qué incluye DigitalOcean por defecto, retención, y **cómo se restaura** | Un backup sin restauración probada no es un backup |
| I7 | **Rotación del certificado de la CA**: ¿caduca? ¿qué hay que hacer cuando DigitalOcean lo renueve? | Es una bomba de relojería: el día que caduque, la aplicación deja de conectar sin que nadie haya tocado nada |
| I8 | **Latencia y región**: ¿la base queda en la misma región que el droplet? | Cada consulta pasa a pagar red. El limitador consulta en cada intento de login |

### Entregable

Un documento en `planes/resultados/` con **una respuesta por pregunta, cada una con su fuente**
(enlace a la documentación oficial o captura de lo que dice la consola). Las que no se puedan
responder sin credenciales de DigitalOcean se listan aparte como preguntas para Emmanuel.

**Sin este documento, la fase 3 no empieza.** Escribir el script de aprovisionamiento con valores
inventados para I1–I4 produce exactamente lo que este plan advierte en su encabezado: una hipótesis
con aspecto de certeza.

---

## Fase 3 — Escribir el script de aprovisionamiento

Un script idempotente —ejecutarlo dos veces no debe romper nada— que deje el droplet listo.
Entregable: `infra/provision.sh` más los ficheros de configuración que instala.

### Lo que debe cubrir

**Sistema base**
- Usuario de servicio **sin privilegios** y sin shell de login. La aplicación no corre como root.
- Actualizaciones de seguridad automáticas (`unattended-upgrades`).
- Firewall: solo 22, 80 y 443. **PostgreSQL nunca expuesto.**
- SSH: sin contraseña, sin root, solo clave.

**PostgreSQL — CAMBIO DE DECISIÓN del 2026-08-06: base ADMINISTRADA de DigitalOcean**

Ya no se instala PostgreSQL en el droplet. Eso invalida varias premisas del Bloque A y de este
plan, y hay que tratarlas una por una **antes** de escribir el script:

- **`DB_SSL=true` pasa a ser obligatorio.** Las bases administradas de DigitalOcean **exigen** SSL.
  La corrección A8 dejó `DB_SSL` como única fuente de decisión, y eso sigue siendo correcto — lo que
  cambia es el valor.
- **`rejectUnauthorized: true` (`sequelize.ts:29`) IMPIDE ARRANCAR sin la CA de DigitalOcean.** Su
  certificado lo firma una CA propia que Node no lleva en su almacén. Hay que dársela, por
  `dialectOptions.ssl.ca` leyendo un fichero, o por `NODE_EXTRA_CA_CERTS` en el `EnvironmentFile`.
  **Requiere variable nueva** (p. ej. `DB_CA_CERT` con la ruta), y por tanto tocar `.example.env` y
  la validación de `env.ts`: si `DB_SSL=true` y no hay CA, debe abortar con un mensaje que lo diga.
  Bajar a `rejectUnauthorized: false` **no** es la salida: convierte el SSL en cifrado sin
  autenticación, que es el defecto que F6-04 corrigió.
- **SB-09 deja de ser deuda futura y pasa a ser requisito de este plan.** Estaba redactada como
  «validar el certificado *si alguna vez* se externaliza». Ya se externalizó.
- **Acceso de red**: la base **no** debe quedar abierta a Internet. Configurar *trusted sources* en
  DigitalOcean para que solo el droplet (y, si acaso, una IP de administración) la alcance. Es el
  equivalente al `127.0.0.1` que se pierde.
- **Permisos del usuario de aplicación**: el limitador crea `rate_limits` con `CREATE TABLE` en el
  primer login. Si el usuario no tiene `CREATE`, **degrada a memoria en silencio** y la protección
  contra fuerza bruta queda decorativa. Crear la tabla en el aprovisionamiento y conceder solo DML
  (plan 08, D8.4).
- **Pool y latencia, que ahora importan.** `sequelize.ts:18-23` fija `pool.max: 5`. La base deja de
  estar en localhost: cada consulta paga latencia de red, y el limitador consulta **en cada intento
  de login** compartiendo ese mismo pool (SB-22). Comprobar el límite de conexiones del plan
  contratado y dimensionar el pool en consecuencia — con la base administrada, SB-22 sube de
  prioridad.
- **Copias de seguridad**: DigitalOcean las gestiona. Sigue haciendo falta **probar una
  restauración**: un backup que nunca se ha restaurado no es un backup, lo gestione quien lo gestione.

Los datos concretos que faltan **no se asumen**: los produce la **fase 2**, que existe para eso.

**Nginx** — es la capa donde probablemente se materializó la redirección del ataque, así que su
configuración versionada es la mitad del valor de este plan:
- `proxy_pass` a `127.0.0.1:<puerto>`; la aplicación **no escucha en la interfaz pública**.
- **`server_name` explícito y un `default_server` que rechace hosts desconocidos.** Sin esto,
  cualquier dominio apuntado al servidor recibe respuesta.
- **Reescribir `X-Forwarded-For`**, no anexarlo. De esto depende que el limitador de A6 identifique
  al cliente real; sin ello es evadible rotando la cabecera.
- TLS con certificado gestionado y renovación automática.
- Los ficheros subidos se sirven con `alias` desde la ruta persistente, con **lista blanca de
  extensiones** (`jpg|jpeg|png|webp`, que es lo que acepta `EXT_MIME` en `uploadsStorage.ts`) y
  `add_header X-Content-Type-Options nosniff`. Node no sirve ficheros.
- Límite de tamaño de cuerpo coherente con el de la aplicación.

**systemd**
- `User=` sin privilegios, `ProtectSystem=strict`, `PrivateTmp=`, `NoNewPrivileges=`.
- `ReadWritePaths=` sobre el `UPLOADS_DIR` **absoluto** — sin esto la subida de ficheros falla con
  `ProtectSystem=strict`, y el error no es evidente.
- `EnvironmentFile=` con permisos `600` y propiedad del usuario de servicio.
- Reinicio automático con backoff.

**Directorio de subidas**
- Ruta persistente **fuera del árbol de despliegue**, p. ej. `/var/lib/tuacreditacion/uploads`, para
  que sobreviva a los redespliegues. Creado con el propietario correcto.

### Decisiones que el script debe tomar explícitamente

- **`output: 'standalone'`**: recomendado pero no cerrado, porque cambia el layout del árbol
  desplegado. Decidir **con la unidad systemd delante** y dejar constancia.
- **PM2 o systemd**: el servidor anterior usaba PM2. systemd da el endurecimiento que PM2 no da.
  Si se queda PM2, el `ecosystem.config.js` **se versiona** — que no lo estuviera es parte de F6-01.
  Y decidir `fork` o `cluster`: afecta al limitador y a los contadores.

### Verificación posible sin droplet
`bash -n` y `shellcheck` sobre el script; `nginx -t` sobre la configuración dentro de un contenedor;
`systemd-analyze verify` sobre la unidad; ejecutar el script dos veces seguidas en un contenedor
Ubuntu limpio y comprobar que la segunda no rompe nada.

---

## Fase 4 — Script de despliegue y vuelta atrás

Separado del aprovisionamiento a propósito: aprovisionar se hace una vez, desplegar muchas.

- `git clone`/`fetch` de un **commit concreto**, `npm ci` (no `npm install`), `npm run build`,
  migraciones si las hay, reinicio del servicio, comprobación de salud, y **vuelta atrás
  automática** si la comprobación falla.
- El `.env` **no** viaja con el código: lo aporta el `EnvironmentFile` de systemd. El repositorio ya
  no lo rastrea (A11).
- **Antes de arrancar por primera vez**: generar secretos nuevos, de 32+ caracteres. Nada del
  servidor anterior se reutiliza — no hay lista de rotación porque **todo es nuevo**.
- `NODE_ENV=production` en el fichero de entorno. La plantilla trae `development` y de ese valor
  dependen todas las exigencias de la validación de arranque: con él puesto, no se activa ninguna.

### Verificación
Despliegue completo en un droplet de prueba; comprobar que la validación de entorno **aborta** si
falta una variable crítica (es el comportamiento correcto, no un fallo); provocar un fallo
deliberado y comprobar la vuelta atrás.

---

## Fase 5 — Comprobación posterior al despliegue *(supervisada, no nocturna)*

Lista de comprobación ejecutable contra el servidor ya en pie:

1. `curl` con un `Host:` desconocido → **rechazado** por el `default_server`.
2. El puerto de la aplicación **no** responde desde fuera; PostgreSQL tampoco.
3. Un fichero `.php` o `.html` en el directorio de subidas → **no se sirve** (lista blanca).
4. Una imagen legítima → se sirve con `nosniff`.
5. `x-forwarded-for` falsificado → el limitador identifica la IP real, no la falsificada. **Es la
   comprobación que valida A6**: sin ella, el limitador queda evadible y nadie se entera.
6. El proceso corre como el usuario sin privilegios y no puede escribir fuera de `ReadWritePaths`.
7. Cabeceras de seguridad presentes y sin duplicados (hoy hay dos fuentes, ver SB-02).
8. Restaurar una copia de seguridad en una base de prueba y comprobar que los datos están.

---

## Decisiones de producto — se toman, no se preguntan

Se registran en [DECISIONES.md](DECISIONES.md) y el crítico las evalúa.

| # | Decisión | Valor por defecto | Razonamiento |
|---|---|---|---|
| D7.1 | Gestor de procesos | **systemd, un solo proceso** | PM2 en cluster multiplica por N los contadores en memoria del limitador, no lee `EnvironmentFile`, convierte el `process.exit(1)` de la validación en tormenta de reinicios y no soporta `next start` como script de cluster |
| D7.2 | ¿CDN o WAF delante? | **No al principio** | Un segundo proxy cambia por completo la lectura de `X-Forwarded-For` y con ella la corrección de A6. Añadirlo después es fácil **si se recuerda revisar el limitador**; el plan lo deja escrito |
| D7.3 | Base de datos | ~~Local, solo en `127.0.0.1`~~ → **ADMINISTRADA de DigitalOcean** (decisión de Emmanuel, 2026-08-06, D0) | El servidor anterior se comprometió y hubo que destruirlo **sin snapshot**: con la base en la misma máquina, los datos mueren con ella. **Ya no es una decisión de este plan** — está tomada. Lo que sí decide el plan es cómo se conecta: `DB_SSL=true`, la CA del proveedor disponible, *trusted sources* en lugar del `127.0.0.1`, y el pool dimensionado al límite del plan contratado. Los datos concretos los produce la **fase 2** |
| D7.4 | `output: 'standalone'` | **Decidir con la unidad systemd escrita delante** | Cambia el layout del árbol desplegado, así que decidirlo antes de tener la unidad es decidir a ciegas |
| D7.5 | Node | **La LTS activa que cumpla `>=20.9.0`** de Next 16.2.12 | Fijada en `engines` y `.nvmrc`, iguales entre sí |
| D7.6 | Copias de seguridad | **Las de DigitalOcean**, y **probar una restauración** antes de dar el droplet por terminado | Con la base administrada, el proveedor las gestiona: se acabó montarlas a mano. Lo que **no** desaparece es probar que restauran — un backup que nunca se ha restaurado no es un backup, lo gestione quien lo gestione. La retención y el procedimiento los averigua la fase 2 (I6) |

**No se decide solo — se propone y se espera:**

1. **Restaurar datos del sistema anterior.** La decisión registrada es que **no**: datos nuevos,
   secretos nuevos. Si alguien quiere recuperar el padrón histórico, hay que decidir cómo se valida
   que ese volcado no viene manipulado — **venía de una máquina comprometida**, y esa validación no
   es un detalle técnico.
2. **Proveedor, dominio y acceso al panel de DNS.** El síntoma del ataque fue una redirección de
   dominio y **nunca se supo si salió de Nginx, del DNS o del proceso comprometido**. El panel de
   DNS merece 2FA y revisión de contactos de recuperación, y eso son credenciales de Emmanuel.
3. **La ejecución real del script contra el droplet.** El script se escribe y se valida en seco de
   noche; ejecutarlo contra el servidor es una fase supervisada.
