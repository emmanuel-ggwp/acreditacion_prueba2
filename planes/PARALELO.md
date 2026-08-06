# Ejecutar varios planes en paralelo

Sí se puede, y con estos planes compensa: son grandes, independientes y tocan ficheros disjuntos.
Pero **no basta con lanzar dos procesos**: hay cuatro recursos compartidos que se pisan en silencio
y producen fallos que parecen bugs del código cuando en realidad son del montaje.

## Lo que NO tiene sentido

**Lanzar `claude -p` y `Workflow` sobre el MISMO plan a la vez.** Harían el mismo trabajo dos veces
sobre los mismos ficheros, y el segundo en commitear encontraría el árbol cambiado bajo sus pies.
Elige uno por plan.

## Los cuatro conflictos, y por qué importan

| Recurso | Qué pasa si se comparte | Síntoma |
|---|---|---|
| **La rama de git** | Dos agentes commiteando a la vez | `index.lock`, commits entrelazados, y W1 (un hallazgo por commit) deja de cumplirse sin que nadie lo note |
| **PostgreSQL** | `npm run db:sync` hace `sync({force:true})`: **borra las 16 tablas** | El plan A siembra sus datos, el plan B ejecuta `db:sync` a mitad de la verificación del A, y el A "descubre" que su corrección no funciona. Es el peor de los cuatro porque **parece un fallo real** |
| **El puerto de la app** | Dos `next start -p 3100` | `EADDRINUSE`, y el segundo proceso muere mientras el primero sigue vivo: se verifica contra **el código del otro plan** sin enterarse |
| **`.next/`** | Dos `npm run build` sobre el mismo directorio | Artefactos mezclados; un plan verifica contra el build del otro |

El tercero me pasó en esta misma sesión: estuve midiendo el limitador contra una instancia antigua
durante varias pruebas antes de darme cuenta.

## La receta

Un worktree, una base de datos y un puerto **por plan**.

```bash
# 1. Worktree con rama propia, partiendo del estado actual
git worktree add ../plan-01 -b plan/01-regresiones
git worktree add ../plan-02 -b plan/02-limitador
git worktree add ../plan-08 -b plan/08-precondiciones

# 2. Una base de datos por plan, en su puerto
docker run -d --name pg_plan01 -p 5433:5432 -e POSTGRES_DB=acreditacion -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=<el de DATABASE_URL> postgres:16-alpine
docker run -d --name pg_plan02 -p 5434:5432 ...
docker run -d --name pg_plan08 -p 5435:5432 ...

# 3. En cada worktree, su .env apuntando a SU base de datos y SU puerto de app
#    (el .env ya no se versiona, así que cada worktree necesita el suyo)
cd ../plan-01 && cp <ruta>/.env . && sed -i 's/:5432/:5433/' .env && npm ci
```

Puertos de aplicación: **3101** para el plan 01, **3102** para el 02, **3108** para el 08. Cada
plan debe usar el suyo en todas sus verificaciones.

Al terminar, se integran por orden y se resuelve lo que aparezca:

```bash
git checkout remediacion/bloque-a
git merge plan/01-regresiones && git merge plan/02-limitador && git merge plan/08-precondiciones
```

## Qué se puede paralelizar, comprobado

Los ficheros que toca cada plan **no se solapan**:

| Plan | Ficheros principales |
|---|---|
| **01** | `public/events/[slug]/register/route.ts`, `participantSchemas.ts`, `eventSchemas.ts`, `GalaTemplate.tsx`, `PublicRegistrationForm.tsx` |
| **02** | `auth-rate-limit.ts`, `rate-limit.ts`, `api/auth/*/route.ts`, `authService.ts` |
| **08** | `.example.env`, `lib/env.ts`, `next.config.js`, `middleware/security.ts`, `package.json` |

**Los tres son paralelizables entre sí.** Es la combinación que más tiempo ahorra, porque son los
tres que bloquean el despliegue.

**Cuidado con estos pares:**

- **04 y 01** se solapan en los `.max()` de los validadores. El 04 depende de que el 01 haya
  terminado; en paralelo, el merge es doloroso.
- **05 y 08** tocan ambos el CORS (`security.ts`, `next.config.js`). **No los paralelices**: el 08
  decide la fuente única de cabeceras y el 05 construye encima.
- **07 depende del 08** por definición: son las precondiciones de la reconstrucción.
- **06** (tests) es independiente de todo, pero **al integrarlo cambiará la línea base de W7** que
  los demás usan como criterio de parada. Intégralo el último o avisa a los demás.

## Lo que sigue siendo secuencial dentro de cada plan

Las fases de un plan **no** se paralelizan entre sí: cada una recibe como contexto las decisiones
que el crítico cerró en la anterior. Ése es el mecanismo que evita que la fase 3 se construya sobre
una premisa que la fase 2 ya demostró falsa.

## Coste

Tres planes en paralelo son tres worktrees (≈1 GB con `node_modules` cada uno), tres contenedores y
tres builds simultáneos. En una máquina con 16 GB va justo pero cabe; con menos, lanza dos.

Y en tokens: cada plan corre sus propios agentes, así que el gasto es la suma, no un reparto. Lo
que se ahorra es tiempo de reloj, no coste.

## Recomendación

**Lanza 01, 02 y 08 en paralelo esta noche.** Son los tres que bloquean el despliegue, no se pisan,
y al terminar tendrás el árbol listo para el 07. El resto puede esperar a que revises las
decisiones de la mañana.
