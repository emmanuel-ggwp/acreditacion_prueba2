# Módulo: Seguridad y autenticación

Volver al [índice](../README.md).

## Propósito

Autenticación por **JWT** (access + refresh), autorización por **rol** re-verificada contra
la BD en cada request, y protecciones transversales (rate-limiting, cookies seguras,
validación, auditoría).

## Autenticación

- **Access token**: JWT **HS256**, vida corta (**15 min**), payload `{ id, role, email,
  username, jti }`. Vive **en memoria** en el cliente (el store persiste solo `{ user }`),
  no en `localStorage`.
- **Refresh token**: JWT HS256 de larga vida, guardado en **cookie HttpOnly + Secure (prod)
  + SameSite=Strict + Path=/api/auth**, y **registrado en BD** (`RefreshToken`). Se **rota**
  en cada refresh y **revoca** el anterior.
- **Restauración de sesión** (`AuthProvider` + `authStore.initAuth`): al recargar, como el
  access token está en memoria, se pide uno nuevo con la cookie de refresh antes de decidir
  autenticado/redirigir.

Archivos: `src/lib/jwt.ts` (sign/verify), `src/lib/authCookie.ts` (flags de cookie),
`src/services/authService.ts` (`login`/`logout`/`refreshAccessToken`/`register`),
`src/store/authStore.ts` (`login`, `logout`, `initAuth`, `refreshAuthToken`),
`src/components/auth/AuthProvider.tsx` y `ProtectedRoute.tsx`.

## Autorización — `withAuth`

`src/middleware/auth.ts`:

```ts
export const GET = withAuth(handler, [ROLES.ADMIN, ROLES.OPERATOR]);
```

- Verifica el access token (`Authorization: Bearer …`), decodifica `{ id, role }`.
- **Re-consulta el usuario en la BD** (`isActive`, `role`) → el rol de la BD es la
  autoridad, no el del token. **Falla cerrado** (503) si no puede consultar.
- Adjunta `req.user = { id, role }` al handler.

### Roles

`src/utils/constants.ts`: `ADMIN='ADMIN'`, `MANAGER='MANAGER'`, `OPERATOR='OPERATOR'`,
**`GUARD='GUARDIA'`** (constante `GUARD`, valor en BD `'GUARDIA'`, etiqueta "Acreditador
Eventos"). Ver la matriz en el [índice](../README.md#roles-y-permisos).

## Rate limiting

`src/lib/rate-limit.ts`: buckets por **usuario** (cuando hay JWT) o por **IP** (anónimo).
El identificador de IP toma el **último salto** de `X-Forwarded-For` (asume un único
ingress). El bucket de login es `(email, ip)` y **falla cerrado**, con respaldo en Postgres
+ memoria. Endpoints públicos usan límites propios (`limitPublicLookup` es el más estricto,
porque `lookup` devuelve datos personales).

## API / endpoints

| Método | Path | Roles | Qué hace |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | público | Inicia sesión; setea cookie de refresh, devuelve access + user. |
| POST | `/api/auth/logout` | público | Cierra sesión; revoca refresh y limpia cookie. |
| POST | `/api/auth/refresh` | público | Rota el refresh (cookie) y devuelve nuevo access. |
| POST | `/api/auth/register` | AUTH | Alta de usuario (flujo controlado). |
| GET/POST | `/api/users` | ADMIN | Listar / crear usuarios. |
| PUT/DELETE | `/api/users/[id]` | ADMIN | Editar / borrar usuario. |
| GET | `/api/audit-logs` | ADMIN | Registro de auditoría. |
| POST | `/api/uploads` | ADMIN, OPERATOR | Subir imagen (nombres UUID, MIME allowlist, sin SVG). |
| GET | `/api/uploads/[filename]` | público | Sirve el archivo (guard de traversal). |
| GET | `/api/health` | público | Healthcheck (error genérico). |

## Auditoría

`src/services/auditLogService.ts` (`log`, `list`) registra acciones sensibles en
`audit_logs` (`userId`, `action`, `entity`, `entityId`, `details`). Lo consumen eventos,
participantes, premios, regalos, etc.

## Variables de entorno

`src/lib/env.ts` valida el entorno (longitud mínima de secretos en producción, expiraciones,
etc.). Claves relevantes: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
`JWT_EXPIRES_IN`, y las **públicas** de correo `NEXT_PUBLIC_EMAILJS_*` (el correo se envía
desde el cliente). No comitear `.env.local`.

## Consola de base de datos (solo lectura)

Herramienta de ADMIN en **Configuración** para ejecutar consultas `SELECT` y ver resultados
(`src/app/api/admin/db-query/route.ts` + `src/components/settings/DbConsole.tsx`). Capas:
rol ADMIN, habilitación por entorno, passphrase, y **transacción `READ ONLY`** con
`statement_timeout` y tope de 1000 filas (siempre hace rollback). Rechaza `;`, todo lo que
no sea `SELECT`/`WITH…SELECT`, y palabras de escritura. Está **apagada por defecto**; para
usarla hay que definir en el entorno:

```
DB_CONSOLE_ENABLED="true"
DB_CONSOLE_PASSPHRASE="<una frase secreta larga>"
```

Sin ambas variables el endpoint responde 403. La passphrase se compara en tiempo constante
y no se guarda en el código.

## Notas / mejoras conocidas (no implementadas)

- El validador no exige que `JWT_SECRET !== JWT_REFRESH_SECRET` (si un operador los iguala,
  un refresh podría usarse como access).
- Varias rutas autenticadas devuelven `error.message` crudo en 500 (fuga de detalles de
  esquema a personal autenticado).
- Permisos de **Regalos**: las escrituras excluyen a MANAGER e incluyen a GUARDIA (ver
  [regalos.md](./regalos.md)).
- El registro público concurrente puede sobrepasar el cupo (falta lock/serialización).
