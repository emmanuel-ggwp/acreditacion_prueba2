# Plan 04 — Bloque B: validación de entrada y fugas por mensajes de error

**No bloquea el redespliegue.** Depende del plan 01 fase 3, que ya alinea los `.max()` que
introdujo el Bloque A; aquí se completa el resto del árbol de validadores.

---

## Fase 1 — F4-03: no existe ninguna longitud máxima en todo el esquema de entrada

`grep -rn "\.max(" src/utils/validators/` da **una sola coincidencia** en los ocho ficheros, y es
`overlayOpacity`. **Ningún campo de texto tiene tope** y ningún parámetro de paginación tampoco.

Los campos que respaldan columnas TEXT (`dietaryComments`, `description`, `awardReason`) aceptan
cadenas arbitrariamente grandes; el único freno es el límite de cuerpo de Next.

**Qué hacer:** un `.max()` por campo, **derivado de la columna que lo respalda** en el modelo
Sequelize, no de un número a ojo. Ese es el error que cometió el Bloque A y que el plan 01 tiene que
arreglar: un tope inventado rechaza datos legítimos. Empezar leyendo cada modelo.

Añadir `maxLength` en los inputs correspondientes para que el freno sea visible antes de enviar.

**Verificación (W3):** para cada esquema tocado, un valor en el límite pasa y uno por encima da
**400 con mensaje claro** (nunca 500 por desbordar la columna).

---

## Fase 2 — F4-04 y F4-05: paginación sin tope y comodines de `LIKE` sin escapar

**F4-04** — `limit` no tiene tope y **no se sanea**: `limit=abc` produce `NaN`, que atraviesa el
valor por defecto. Con un `limit` grande se vuelca el padrón entero en una petición. Tope duro y
saneamiento numérico.

**F4-05** — los filtros de búsqueda interpolan la entrada en `LIKE` sin escapar `%` ni `_`. No es
inyección SQL (Sequelize parametriza), pero permite construir búsquedas que recorren toda la tabla,
y `%` como término devuelve todo.

**Verificación (W3):** `limit=abc`, `limit=999999` y `limit=-1` → acotados, no 500. Búsqueda con
`%` → trata el símbolo como texto, no como comodín.

---

## Fase 3 — F2-05 y F4-06: el `errorHandler` devuelve el error crudo al cliente

`errorHandler` devuelve `error.message` tal cual. Efectos observados en esta misma sesión: un fallo
de validación de Zod sale como **500 con el objeto de error completo**, y un fallo de escritura de
fichero **filtra la ruta absoluta del sistema de ficheros**.

**Qué hacer:** mensaje genérico hacia fuera, detalle al log del servidor. Revisar de paso
`register/route.ts:77`, que devuelve `validation.error.format()` al público y expone la forma del
esquema, y el 500 de `api/uploads/route.ts:58`.

**Cuidado con no pasarse:** los mensajes que el cliente **sí** usa para decidir (`ALREADY_REGISTERED`
y los códigos del registro público) deben seguir llegando. Genérico no es lo mismo que mudo.

**Verificación (W3):** provocar un error de base de datos → el cliente recibe un mensaje genérico y
**el log del servidor conserva el detalle**. Los códigos de negocio siguen funcionando.

---

## Decisiones de producto — se toman, no se preguntan

Se registran en [DECISIONES.md](DECISIONES.md) y el crítico las evalúa.

| # | Decisión | Valor por defecto | Razonamiento |
|---|---|---|---|
| D4.1 | Origen de cada `.max()` | **La columna que respalda el campo** | Un tope inventado rechaza datos legítimos: es exactamente el error que cometió el Bloque A con la dieta y que el plan 01 tiene que arreglar |
| D4.2 | Campos de texto libre con columna corta | **Ampliar la columna a TEXT** si hay migraciones; si no, recortar el tope y registrar la deuda | `dietaryComments` es `VARCHAR(255)` para describir alergias. Sin migraciones (SB-26) ampliar exige un `sync` destructivo, que no compensa |
| D4.3 | Alcance de F2-05 | **De una vez**, con una lista explícita de códigos que sí deben seguir llegando | Endpoint por endpoint deja meses con dos comportamientos conviviendo. La lista de códigos preservados (`ALREADY_REGISTERED`, `EVENT_FULL`, `SCHEDULE_FULL`…) es lo que evita romper el cliente |
| D4.4 | Tope de `limit` en paginación | **200**, y `NaN`/negativos al valor por defecto | Los listados de la interfaz piden mucho menos; 200 permite exportaciones razonables sin volcar el padrón entero en una petición |

**No se decide solo:** cualquier cambio de columna que exija recrear tablas. Se propone y se
espera — con `db:sync` en estado destructivo (SB-26), una migración mal hecha borra los datos.
