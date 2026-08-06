# Baterías W3 del plan 01

Las verificaciones **ejecutadas** que cerraron las cuatro fases de
[`planes/01-regresiones-bloque-a.md`](../../planes/01-regresiones-bloque-a.md). Están
aquí porque una verificación que solo existe en la sesión que la corrió no es
reproducible, y W3 exige poder repetirla.

Cada batería se ejecuta **igual contra el código de antes y el de después**: esa es la
mitad que suele faltar. El «antes» de cada fase se obtuvo revirtiendo su propio commit y
reconstruyendo, no razonando sobre el código.

| Script | Fase | Qué demuestra |
|---|---|---|
| `fase1-cupo-invitados.sh` | 1 · `0fd0130` | El acompañante se guarda con el cupo por defecto; las cargas del organizador no consumen cupo; `allowGuests=false` sigue bloqueando; 50 invitados no crean 50 filas |
| `fase2-ya-inscritos.sh` | 2 · `5a84ed8` | A un participante ya inscrito no le cambia ni una columna, ni suya ni de sus invitados; solo se enlaza la fecha nueva. El camino legítimo sigue vivo |
| `fase3-topes-longitud.sh` | 3 · `397bfa6` | Una alergia de 200 caracteres se guarda; un comentario de 300 da 400 y no 500; un precargado con preferencia larga puede inscribirse |
| `fase4-orden-validacion.sh` | 4 · `63e30d4` | `scheduleIds` mal formado da 400 y no 500, en los dos modos; el registro legítimo sigue funcionando |

## Cómo se corren

Hace falta el contenedor de PostgreSQL y una instancia **de producción** escuchando en
el 3100 — el `.env` de desarrollo no arranca `next start` (validación de A10):

```bash
docker start acreditacion_pg_local
```

```bash
ALLOWED_ORIGIN="http://localhost:3100" UPLOADS_DIR="/var/lib/app/uploads" JWT_SECRET="$(head -c 32 /dev/urandom | base64)" JWT_REFRESH_SECRET="$(head -c 32 /dev/urandom | base64)" JWT_EXPIRES_IN="15m" JWT_REFRESH_EXPIRES_IN="7d" NODE_ENV=production npx next start -p 3100
```

En Git Bash sobre Windows, anteponer `MSYS_NO_PATHCONV=1` o la ruta `/var/...` se
convierte. Para matar el servidor: `Get-NetTCPConnection -LocalPort 3100` y
`Stop-Process`; `pkill` no vale.

Después, sembrar los fixtures de la fase y pasar los identificadores que imprime. Cada
script documenta sus argumentos en la cabecera. Ejemplo de la fase 2:

```bash
npx tsx scripts/seed-r102-fixtures.ts
```

```bash
bash scripts/w3-plan-01/fase2-ya-inscritos.sh DESPUES <slug> <sch1> <sch2> <victimaId> <g1> <g2> <legitimoId> <g3>
```

## Dos avisos que cuestan tiempo si no se saben

**Sembrar de nuevo antes de cada batería, no reaprovechar.** Una batería modifica los
datos de otra: la prueba de registro legítimo de la fase 4 **renombra** al participante
que la fase 3 busca por apellido, y la búsqueda devuelve vacío. Los seeds solo insertan
—crean eventos nuevos con sufijo de tiempo—, así que correrlos otra vez es gratis y
seguro.

**`npm run db:sync` ya no borra** (desde P08-D4, 2026-08-06): por defecto hace
`sync({ alter: true })`; el DROP total exige `FORCE_SYNC=yes` explícito. Si faltan
datos, `npm run db:seed:users` y los `seed-*` de este directorio, que solo insertan.
