# Módulo: Regalos Navidad

Volver al [índice](../README.md).

## Propósito

Gestiona la entrega de regalos de Navidad a empleados, agrupada por **campaña** (ej.
"Navidad 2025"). Cada campaña define **tipos de regalo** cuya cantidad debida por empleado
se calcula según un `basis`: `FAMILY` (1 por empleado), `CHILD` (= `cargasHijos`) o `CARGA`
(= `cargas`). Se cargan **empleados** (manual o Excel/CSV, con `cargas` y `cargasHijos`) y
se registran **entregas** contra el total que le corresponde a cada empleado por tipo.
Incluye resúmenes por tipo y por empresa, y exportación a Excel.

## Modelo de datos

Asociaciones centralizadas en `src/models/index.ts`.

### `GiftCampaign` — `gift_campaigns` (paranoid)
`name`, `isActive`. `hasMany(GiftType as 'types')`, `hasMany(GiftEmployee as 'employees')`.

### `GiftType` — `gift_types` (no paranoid)
`campaignId`, `name`, `basis` (`FAMILY|CHILD|CARGA`, default `FAMILY`), `order`, `isActive`.
`belongsTo(GiftCampaign)`, `hasMany(GiftDelivery as 'deliveries')`.

### `GiftEmployee` — `gift_employees` (paranoid)
`campaignId`, `fullName`, `rut`, `empresa`, `cargas`, `cargasHijos`, `source`
(`IMPORT|MANUAL`). `belongsTo(GiftCampaign)`, `hasMany(GiftDelivery as 'deliveries')`.
(El "upsert por RUT" de la importación es lógico; **no** hay índice único.)

### `GiftDelivery` — `gift_deliveries` (no paranoid)
`employeeId`, `giftTypeId`, `deliveredQty`, `deliveredAt`, `deliveredBy`.
Índice **único** `(employee_id, gift_type_id)` (una fila de entrega por empleado+tipo).

## Servicios — `giftService` (`src/services/giftService.ts`)

Helper `totalFor(basis, emp)`: `CHILD→cargasHijos`, `CARGA→cargas`, `FAMILY→1`.

- `listCampaigns()` / `getCampaign(id)` / `createCampaign(name)` (siembra 2 tipos por
  defecto: "Caja familiar"/FAMILY y "Regalo hijo"/CHILD) / `updateCampaign(id, data)`.
- `deleteCampaign(id)` — **cascada en transacción** (entregas → tipos → empleados →
  campaña, con `force`).
- `listTypes(campaignId)` / `createType` / `updateType` / `deleteType(id)` (borra sus
  entregas en transacción).
- `listEmployees(campaignId)` — devuelve cada empleado con `gifts[]`: por tipo,
  `{total, delivered, status}` (`NA`/`DELIVERED`/`PARTIAL`/`PENDING`).
- `createEmployee` / `updateEmployee` / `deleteEmployee(id)` (borra sus entregas).
- `importEmployees(campaignId, rows[])` — upsert por `rut` dentro de la campaña; devuelve
  `{created, updated, errors[]}` (fila a fila, no transaccional).
- `setDelivery(employeeId, giftTypeId, qty, deliveredBy?)` — valida misma campaña, **topa**
  `qty` al total debido, `findOrCreate` por (empleado, tipo) y sella `deliveredAt`/`deliveredBy`.
- `summary(campaignId)` — `{totalEmpleados, byType[], byEmpresa[]}`.

## API / endpoints

| Método | Path | Roles | Qué hace |
| --- | --- | --- | --- |
| GET | `/api/gift-campaigns` | ADMIN, OPERATOR, MANAGER, GUARD | Lista campañas. |
| POST | `/api/gift-campaigns` | ADMIN, OPERATOR, GUARD | Crea campaña (+ tipos por defecto). |
| GET | `/api/gift-campaigns/[id]` | ADMIN, OPERATOR, MANAGER, GUARD | `{campaign, types, summary}`. |
| PUT | `/api/gift-campaigns/[id]` | ADMIN, OPERATOR, GUARD | Actualiza campaña. |
| DELETE | `/api/gift-campaigns/[id]` | ADMIN, OPERATOR, GUARD | Elimina en cascada. |
| GET | `/api/gift-campaigns/[id]/types` | ADMIN, OPERATOR, MANAGER, GUARD | Lista tipos. |
| POST | `/api/gift-campaigns/[id]/types` | ADMIN, OPERATOR, GUARD | Crea tipo. |
| GET | `/api/gift-campaigns/[id]/employees` | ADMIN, OPERATOR, MANAGER, GUARD | Empleados con `gifts[]`. |
| POST | `/api/gift-campaigns/[id]/employees` | ADMIN, OPERATOR, GUARD | Crea empleado (MANUAL). |
| POST | `/api/gift-campaigns/[id]/employees/import` | ADMIN, OPERATOR, GUARD | Importa (upsert por RUT). |
| PUT/DELETE | `/api/gift-types/[id]` | ADMIN, OPERATOR, GUARD | Edita / borra tipo. |
| PUT/DELETE | `/api/gift-employees/[id]` | ADMIN, OPERATOR, GUARD | Edita / borra empleado. |
| POST | `/api/gift-deliveries` | ADMIN, OPERATOR, MANAGER, GUARD | Registra entrega (`deliveredBy = req.user.id`). |

## Componentes / UI

Página `src/app/gifts/page.tsx` (RoleGuard `[ADMIN, MANAGER, OPERATOR, GUARD]`).
No hay store dedicado (estado local con `useState` + `apiClient`) ni validadores Zod (la
validación es imperativa en el servicio).

- `components/gifts/GiftsModule.tsx` — pantalla principal: campañas, tipos, tarjetas de
  totales por tipo y por empresa, tabla de empleados con inputs de entrega (optimista +
  persistencia en `onBlur`, "Entregar todo"), export a `.xlsx`.
- `components/gifts/GiftEmployeeImport.tsx` — modal de importación Excel/CSV con autodetección
  de columnas (nombre, rut, empresa, cargas, cargasHijos) y plantilla descargable.

## Flujos clave

1. **Crear campaña → tipos → empleados → entregar**: `POST /gift-campaigns` (crea 2 tipos
   por defecto) → ajustar tipos → agregar/importar empleados → `POST /gift-deliveries` (topa
   al total debido y sella entrega).
2. **Importar empleados**: la UI lee el archivo, mapea columnas y hace `POST
   .../employees/import` (upsert por RUT); devuelve creados/actualizados/errores.
3. **Registrar entrega (UI optimista)**: cambio local (clamp a `[0,total]`) → `onBlur` →
   `POST /gift-deliveries` → recarga `summary`.
4. **Eliminar campaña**: `DELETE /gift-campaigns/[id]` → cascada transaccional (sin huérfanos).

## Notas / permisos (⚠️ incoherencia conocida)

- **MANAGER queda EXCLUIDO de todas las escrituras** de Regalos (solo lee y registra
  entregas), pese a que su descripción dice "Gestión completa: … Regalos".
- **GUARDIA puede escribir todo** en Regalos (crear/editar/**borrar** campañas, tipos,
  empleados e importar), lo que es amplio para un rol de puerta. Es un punto pendiente de
  revisión (ver [seguridad-auth.md](./seguridad-auth.md)).
- `setDelivery` topa la cantidad al entitlement (`totalFor`), cerrando el hueco de exceder
  entregas por llamada directa a la API.
