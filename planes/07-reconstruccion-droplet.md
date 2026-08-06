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

De ahí la forma del plan: el script se escribe, se valida en seco todo lo validable en seco
(sintaxis, idempotencia, `nginx -t` en contenedor), y **la ejecución real contra el droplet es una
fase supervisada, no nocturna**. Lo que sí puede correr de noche es todo lo anterior.

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

## Fase 2 — Escribir el script de aprovisionamiento

Un script idempotente —ejecutarlo dos veces no debe romper nada— que deje el droplet listo.
Entregable: `infra/provision.sh` más los ficheros de configuración que instala.

### Lo que debe cubrir

**Sistema base**
- Usuario de servicio **sin privilegios** y sin shell de login. La aplicación no corre como root.
- Actualizaciones de seguridad automáticas (`unattended-upgrades`).
- Firewall: solo 22, 80 y 443. **PostgreSQL nunca expuesto.**
- SSH: sin contraseña, sin root, solo clave.

**PostgreSQL local**
- Escuchando **solo en `127.0.0.1`**. Es lo que hace correcta la decisión de A8 de no exigir SSL.
- Usuario de aplicación con permisos acotados a su base. **Necesita `CREATE`**: el limitador crea
  su tabla `rate_limits` al arrancar (`auth-rate-limit.ts`). Si no lo tiene, degrada a memoria en
  silencio y se descubre tarde.
- Copias de seguridad automáticas con **restauración probada**. Un backup que nunca se ha
  restaurado no es un backup.

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

## Fase 3 — Script de despliegue y vuelta atrás

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

## Fase 4 — Comprobación posterior al despliegue *(supervisada, no nocturna)*

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
| D7.3 | PostgreSQL | **Local, solo en `127.0.0.1`** | Es lo ya decidido y lo que hace correcta A8. Externalizarlo obliga a `DB_SSL=true` y a instalar la CA |
| D7.4 | `output: 'standalone'` | **Decidir con la unidad systemd escrita delante** | Cambia el layout del árbol desplegado, así que decidirlo antes de tener la unidad es decidir a ciegas |
| D7.5 | Node | **La LTS activa que cumpla `>=20.9.0`** de Next 16.2.12 | Fijada en `engines` y `.nvmrc`, iguales entre sí |
| D7.6 | Copias de seguridad | **Diarias con restauración probada** antes de dar el droplet por terminado | Un backup que nunca se ha restaurado no es un backup. Es barato ahora y caro después |

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
