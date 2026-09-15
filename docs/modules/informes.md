# Módulo: Informes

Volver al [índice](../README.md).

## Propósito

Reportes y métricas: un **dashboard** global, el **reporte por evento** (resumen y CSV
descargable), un **feed en tiempo real** de acreditación y un **listado de eventos** con
sus conteos.

## Servicios — `reportService` (`src/services/reportService.ts`)

- `getDashboardStats()` — métricas globales (o por evento): totales de participantes,
  acreditados hoy, etc.
- `getEventReport(eventId)` — resumen del evento: por fecha (cupo, aforo, acreditados,
  registrados incl. invitados numéricos), `capacityUsedPercentage` basado en participantes,
  y `maxAttendees` por fecha (R3/R4/R5).
- `getRealTimeStats(eventId)` — ritmo de acreditación (últimos 30 min, capacidad actual,
  acreditaciones/minuto).
- `getGeneralReport(eventId)` — filas para el CSV (participante × fecha, con asistencia,
  invitados, dieta y premio); **SQL crudo** con `replacements`, filtrando borrados
  (`deleted_at IS NULL` en participantes e invitados).
- `generateCsv(data)` — serializa a CSV con **BOM UTF-8** y **escape anti-inyección de
  fórmulas** (celdas que empiezan por `= + - @` se prefijan con `'`).

## API / endpoints

| Método | Path | Roles | Qué hace |
| --- | --- | --- | --- |
| GET | `/api/reports/dashboard` | ADMIN, MANAGER, OPERATOR, GUARD | Métricas del panel. |
| GET | `/api/reports/events` | ADMIN, MANAGER, OPERATOR, GUARD | Eventos con conteos. |
| GET | `/api/reports/events/[eventId]` | ADMIN, MANAGER, OPERATOR | Reporte del evento; `?type=general` → **CSV** (`text/csv; charset=utf-8`). |
| GET | `/api/reports/realtime/[eventId]` | ADMIN, MANAGER, OPERATOR, GUARD | Estadísticas en vivo. |

## Componentes

- `components/reports/EventReport.tsx` — vista del reporte por evento (resumen por fecha,
  aforo vs cupo, %).
- `components/events/ButtonEventReport.tsx` — botón de descarga del CSV.

## Flujos clave

1. **Dashboard**: al entrar al panel → `GET /api/reports/dashboard`.
2. **Reporte de evento**: `EventReport` → `GET /api/reports/events/[id]`; el botón descarga
   el CSV (`?type=general`).
3. **Tiempo real**: la pantalla de acreditación/panel refresca `GET /api/reports/realtime/[id]`.

## Notas de seguridad y correctitud del CSV

- **Inyección de fórmulas**: neutralizada anteponiendo `'` a celdas peligrosas (vía la
  opción `cast.string` de `csv-stringify`).
- **Borrados**: el reporte general (SQL crudo) filtra `deleted_at IS NULL` en participantes
  y en las subconsultas de invitados (Sequelize no aplica el paranoid en SQL crudo).
- **Acentos**: `bom: true` + `charset=utf-8` para que Excel (Windows) no rompa `ñ`/tildes.
- Divisiones y porcentajes están guardados contra cero (`capacity > 0 ? … : 0`).
