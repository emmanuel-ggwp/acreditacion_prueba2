# Runbook — reconstrucción del droplet y operación de la base administrada

Plan 07, fase 3. Complementa a `infra/provision.sh`: aquí vive **lo que el
script no puede hacer** (pasos de consola de DigitalOcean) y los procedimientos
que se ejecutan pocas veces pero que, sin escribir, se improvisan mal — que es
el modo de fallo que F6-01 documenta.

**R2 recuerda:** ninguna credencial se pega en chats, issues ni logs. Aquí solo
se nombran variables y rutas.

---

## 1. Reconstruir el droplet desde cero

Orden de pasos. Los E# son las preguntas de la fase 2 aún abiertas
(`planes/resultados/07-fase2-base-administrada-digitalocean-2026-08-06.md`).

1. **Crear el droplet en la MISMA región y VPC que el cluster** (I8/E6). Si el
   cluster no existe todavía, crear ambos juntos decidiendo región una sola
   vez. Ubuntu 24.04 LTS (la unidad systemd usa `RestartSteps`, systemd >= 254).
   Crear el droplet **con clave SSH**, nunca con contraseña.
2. **Trusted sources — PASO OBLIGATORIO EN CADA RECONSTRUCCIÓN:** añadir el
   droplet nuevo al cluster **como recurso** (tipo droplet, no por IP). Un
   droplet reconstruido tiene **ID nuevo**: la entrada del droplet anterior no
   lo cubre y hay que re-añadirlo SIEMPRE. En cuanto hay al menos una trusted
   source, todo lo demás queda bloqueado — que es el estado correcto
   («PostgreSQL nunca expuesto»).
3. **Clonar el repositorio** (rama de despliegue) en el droplet.
4. **Ejecutar el aprovisionamiento:**
   `DOMAIN=<dominio> CERTBOT_EMAIL=<correo> bash infra/provision.sh`
   Es idempotente: se puede re-ejecutar tras corregir cualquier paso pendiente.
5. **Descargar la CA del cluster** (si es Standard Edition — E1) desde la
   consola: *Databases → cluster → Connection Details → Download CA
   certificate*, a `/etc/tuacreditacion/ca-certificate.crt`. **Apuntar su
   caducidad** (§3): `openssl x509 -in /etc/tuacreditacion/ca-certificate.crt -noout -enddate`
6. **Crear el usuario de aplicación** en la consola (Users & Databases) si no
   existe, y **ejecutar `infra/sql/provision-db.sql` como doadmin** (cabecera
   del propio fichero). Dos identidades de conexión, siempre:
   - **migraciones/aprovisionamiento**: doadmin (crea tablas; los `ALTER
     DEFAULT PRIVILEGES` del script cuelgan de esa identidad),
   - **servicio**: usuario de aplicación, solo DML (DELETE incluido: el
     limitador purga expirados). La app **no** tiene ni necesita `CREATE`.
7. **Completar `/etc/tuacreditacion.env`**: `DATABASE_URL` con el **hostname
   privado** de la VPC, el usuario de aplicación y **sin `?sslmode=...`** (el
   arranque la rechaza si lo trae — P07-D7.10). Las `NEXT_PUBLIC_*` antes del
   build. Los secretos JWT ya los generó provision.sh: no tocarlos.
8. **Desplegar el código** (fase 4; pasos en §8), **aplicar las migraciones** (§7) y
   arrancar: `systemctl start tuacreditacion`.
9. **Pasar la lista de comprobación posterior** (plan 07, fase 5): Host
   desconocido rechazado, puertos internos cerrados, `.php` en uploads no
   servido, imagen legítima con nosniff, `x-forwarded-for` falsificado
   ignorado, proceso sin privilegios, cabeceras sin duplicar, restauración
   probada.
10. **DNS**: apuntar el dominio al droplet nuevo. El panel de DNS merece 2FA y
    revisión de contactos de recuperación (decisión de Emmanuel, plan 07).

## 2. Acceso de desarrollo a la base (E4, pendiente de decisión)

Opciones: IP de desarrollo como trusted source (caduca con IP dinámica; hay
que re-añadirla) o túnel SSH por el droplet (no depende de la IP; preferida
por seguridad). Mientras no se decida E4, **no** añadir IPs domésticas
permanentes.

## 3. La CA del cluster: caducidad y sustitución (I7)

DigitalOcean **no publica** la validez ni la política de rotación de la CA
(verificado 2026-08-06). Por eso:

- **Al descargarla, apuntar su `notAfter`** con margen de aviso >= 1 mes:
  `openssl x509 -in /etc/tuacreditacion/ca-certificate.crt -noout -enddate`
- **Sustitución** (también si DigitalOcean la rota): re-descargar desde la
  consola → reemplazar `/etc/tuacreditacion/ca-certificate.crt` →
  `systemctl restart tuacreditacion`. La app tolera el reinicio; lo que no
  tolera es que caduque sin que nadie mire.
- Si el cluster resulta ser **Advanced Edition** (E1), no hay CA que gestionar
  (almacén del sistema) y `DB_CA_CERT` pasa a opcional en `env.ts` (P07-D7.9).

## 4. Copias de seguridad y restauración (P07-D7.6)

Lo administrado: backup **diario**, retención **7 días**, point-in-time
recovery. La restauración **SIEMPRE crea un cluster NUEVO**.

**Prueba de restauración** (obligatoria antes de dar el droplet por terminado,
y recomendada periódicamente) — el ciclo completo, no una parte:

1. Consola: cluster → *Actions → Restore from backup* → elegir punto →
   **Restore to New Cluster**.
2. Repuntar una instancia de prueba: `DATABASE_URL` nueva, CA nueva (cada
   cluster firma con la suya), trusted source de la máquina de prueba.
3. **Comprobar los datos** (usuarios, eventos, inscripciones recientes).
4. **Destruir el cluster de prueba** — se paga mientras exista.

> **ADVERTENCIA OFICIAL DE DIGITALOCEAN: destruir un cluster destruye sus
> backups.** Los backups administrados protegen contra pérdida de datos, NO
> contra el borrado (accidental o malicioso) del cluster: el modo de fallo
> F6-01 puede repetirse por esa vía. La mitigación barata es un **dump lógico
> periódico fuera del cluster** (`pg_dump` a almacenamiento independiente):
> es **SB-37** y es una decisión CON Emmanuel (coste mensual + una copia de
> los datos viviendo fuera del cluster), registrada como pendiente — este
> runbook se actualiza cuando se decida.

## 5. Pool de conexiones

`pool.max: 5` (sequelize.ts) **no se toca sin E3** (plan contratado): el
limitador comparte la instancia de Sequelize (no suma conexiones), y hasta el
plan más pequeño (22 conexiones) aguanta el pool actual con margen x4.
Redimensionar a ciegas sería inventar el dato que la fase 2 existe para no
inventar (SB-22).

## 6. Qué es normal que quede pendiente tras provision.sh

El script imprime al final la lista `PENDIENTE`. Ninguna de esas entradas es
un fallo: son los pasos que exigen consola o credenciales (trusted sources,
CA, usuario de aplicación, DATABASE_URL, certificado si faltaba el DNS). El
script se re-ejecuta sin miedo después de completarlas: es idempotente y no
regenera secretos.

## 7. Migraciones en el droplet (`npm run db:migrate:prod`)

**Runner sin `tsx`.** En el droplet NO están `tsx` ni `typescript` (son
devDependencies y no se instalan en producción) — por eso un `npm run db:migrate`
«no encontraba nada que migrar». Las migraciones se corren desde su **versión
compilada a JS** en `dist-migrate/`, con `node` y solo dependencias de producción
(`umzug` —que pasó a dependency—, `sequelize`, `pg`, `zod`, `bcryptjs`, `dotenv`).
Esa compilación la hace **`npm run build`** (gancho `postbuild` → `migrate:build`,
que corre `tsc -p tsconfig.migrate.json`), aprovechando que en el build
`typescript` sí está porque `next build` lo exige. Por tanto: **primero
`npm run build`, y recién después las migraciones**. `scripts/migrate.ts` sigue
siendo la fuente única (en desarrollo se corre con `tsx` vía `npm run db:migrate`);
el runner detecta si es `.ts`/`.js` y globea las migraciones de su misma clase.

Dos identidades (§1, paso 6): el **servicio** conecta con el usuario de
aplicación (la `DATABASE_URL` de `/etc/tuacreditacion.env`) y las
**migraciones** con `doadmin`. El script `scripts/migrate.ts` **no** pasa por
systemd, así que no ve `/etc/tuacreditacion.env` solo: lee un `.env` del
directorio actual si existe (desarrollo) y, si no, lo que haya exportado en la
shell. Hay que cargar el fichero del servicio a mano y exportar encima la URL
de doadmin:

```bash
read -rsp 'Contraseña de doadmin: ' PW; echo
DBH=<host-del-cluster>          # el mismo host que usa el servicio; echo "$DBH" para ver que está entero
sudo env DOADMIN_PW="$PW" DBH="$DBH" bash -c '
  set -a; . /etc/tuacreditacion.env; set +a
  export DATABASE_URL="postgresql://doadmin:${DOADMIN_PW}@${DBH}:25060/defaultdb"
  cd /srv/tuacreditacion/app && npm run db:migrate:prod:status && npm run db:migrate:prod
'
unset PW
```

- **Sin `?sslmode=require`.** La URL que copia la consola de DigitalOcean lo
  trae; con nuestro stack ese parámetro **pisa** la configuración SSL real
  (`rejectUnauthorized` y la CA) y el driver acaba validando el certificado
  sin la CA del cluster: `self-signed certificate in certificate chain`
  (P07-D7.10). Desde el 2026-09-15 el script aplica la **misma validación que
  la app** y aborta nombrando el problema antes de conectar. El SSL lo deciden
  `DB_SSL=true` y `DB_CA_CERT`, que vienen del fichero cargado con `set -a`.
- **El host va en una variable aparte** porque la línea completa de la URL se
  corta al pegarla en la terminal (2026-09-15: el script intentó resolver
  `dbaa`). Es el mismo host que usa el servicio (trusted sources solo admite
  el droplet). Si la contraseña lleva `@ : / # ? %`, va percent-encoded.
- **La URL de doadmin NO se guarda en ningún sitio**: ni en `/etc/environment`
  (legible por todos y heredado por sudo: así llegó el `?sslmode=require` a la
  migración el 2026-09-15), ni en `.bashrc`, ni en el repo. Se pide cada vez.
- **`sudo`** porque `/etc/tuacreditacion.env` es 600 del usuario de servicio.
  La contraseña se pide con `read -s` para que no quede en el historial de la
  shell (R2). Solo `migrate.ts` tiene esta validación: `db:sync` y los seeds
  siguen sin ella y no se ejecutan en el droplet.
- **Comprobar antes que no hay un `.env` en `/srv/tuacreditacion/app`**
  (`ls -la /srv/tuacreditacion/app/.env`). Un `.env` pegado desde la consola
  no pisa las variables exportadas, pero es configuración fuera de sitio: el
  entorno del servidor vive en `/etc/tuacreditacion.env` y solo ahí (F6-01).
- **`dist-migrate/` debe existir** (lo crea `npm run build`). Si falta, `node`
  falla con «Cannot find module dist-migrate/scripts/migrate.js»: faltó el build.
- El **primer** comando (`status`) no toca nada: lista ejecutadas y pendientes.
  Revertir es `node dist-migrate/scripts/migrate.js down` con el mismo entorno y
  revierte **solo la última**; la línea base `0001` se niega a revertirse.
- **Estado por SQL.** La tabla de control se llama **`sequelize_meta`**
  (minúsculas, por `underscored: true`), NO `"SequelizeMeta"`. Para ver qué se
  aplicó: `SELECT name FROM sequelize_meta ORDER BY name;`. En la consola de solo
  lectura, un `SELECT ... FROM "SequelizeMeta"` da «no existe la relación» aunque
  las migraciones sí hayan corrido — es el nombre, no la ausencia.

## 8. Actualizar la app con código nuevo (despliegue habitual)

Lo que se hace **cada vez** que hay cambios en `main` y hay que llevarlos al
servidor. Se entra por SSH con el usuario administrador (`operador`, dueño de
`/srv/tuacreditacion/app`), **no** como root: si `git`, `npm` o el build corren
como root, dejan ficheros de root en el árbol y el siguiente despliegue falla
por permisos.

**Cuándo:** fuera de horario de acreditación. El reinicio corta la app unos
segundos; no se pierden datos, pero un operador en la puerta vería un error.

```bash
cd /srv/tuacreditacion/app

# 1. Ver que no hay cambios locales. Debe decir "nothing to commit": el
#    servidor no se edita a mano. Si hay algo, parar y averiguar qué es.
git status

# 2. Bajar el código nuevo.
git pull

# 3. Instalar las librerías EXACTAS del package-lock.json. Obligatorio aunque
#    "parezca que no cambió nada": si se salta, el build usa las versiones
#    viejas (p. ej. un parche de seguridad de Next.js no llega a producción).
#    Instala también las devDependencies: el build las necesita (typescript,
#    tailwindcss, postcss).
npm ci

# 4. Compilar con el entorno de producción. El build necesita las variables de
#    /etc/tuacreditacion.env (las NEXT_PUBLIC_* quedan grabadas en el build y
#    la app valida el entorno al compilar). El fichero es 600 del usuario de
#    servicio: se lee con sudo y se carga SOLO dentro de los paréntesis, para
#    que los secretos no queden en la sesión ni en el historial.
( set -a; . <(sudo cat /etc/tuacreditacion.env); set +a; npm run build )

# 5. Quitar las devDependencies, que en producción no hacen falta.
npm prune --omit=dev

# 6. Migraciones: SOLO si el cambio trae alguna nueva. Ver §7 (primero el
#    `status`; si dice "Pendientes (0)", no hay nada que hacer).

# 7. Reiniciar el servicio para que cargue el build nuevo.
sudo systemctl restart tuacreditacion
```

**Comprobar que quedó bien:**

```bash
# Debe decir "active (running)". Si no, ver los logs (siguiente comando).
systemctl status tuacreditacion --no-pager

# Últimas líneas del log del servicio (errores de arranque, entorno, BD).
sudo journalctl -u tuacreditacion -n 50 --no-pager

# La app y la base responden: debe devolver {"status":"ok","db":"connected"}.
curl -s http://127.0.0.1:3000/api/health; echo
```

Y entrar a la app desde el navegador y abrir alguna pantalla tocada por el
cambio.

**Si algo sale mal:**

- **Falla `npm run build`:** la app sigue funcionando con el build anterior
  mientras NO se reinicie. Ver el error, corregir en el repo, subir y repetir
  desde el paso 2. No reiniciar con un build roto.
- **Falla el arranque tras reiniciar** (el `status` no dice `running`): volver
  a la versión anterior y recompilar:
  `git log --oneline -5` para ver el commit previo, `git checkout <commit>` y
  repetir los pasos 3, 4, 5 y 7. Después, `git checkout main` cuando el
  arreglo esté subido.
- **«Configuración de entorno inválida» en el log o en el build:** falta o
  está mal una variable de `/etc/tuacreditacion.env` (ver §1, paso 7). El
  mensaje nombra la variable.
