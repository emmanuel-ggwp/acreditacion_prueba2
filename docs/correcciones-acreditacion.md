# Acreditación: importación, búsqueda y reportes

## Excel de participantes

- En Acompañante (sí/no) escribir Sí o No. Las cantidades van en N° de cargas, sin sumar al acompañante.
- La importación conserva las cargas y las cantidades de invitados, separándolas de los invitados con nombre.
- Al reimportar, una celda vacía conserva el dato anterior. Un cero o un No explícitos sí lo actualizan.
- Las cantidades deben ser enteros no negativos. Los valores inválidos se informan por fila; no se convierten silenciosamente en cero.
- No se actualizan cantidades de una persona cuyo correo coincide con otro RUT, ni se mezclan por reimportación cantidades numéricas con invitados con nombre ya existentes.
- Reimportar no modifica las acreditaciones que ya registraron quién llegó.

## Búsqueda

El listado Participantes admite nombre y apellido juntos, fragmentos como Ricardo V, mayúsculas, tildes y espacios repetidos. Conserva la búsqueda por RUT con distintos formatos.

## Excel de acreditados

Desde Reportes, Descargar acreditados (Excel) consulta datos nuevos y genera dos hojas:

- Resumen: todos los inscritos y los ingresos efectivos por fecha, más un total que suma fechas.
- Acreditados: una fila por titular y fecha con algún ingreso real del grupo. Puede haber invitados acreditados sin que el titular haya asistido.

Para comparar con la web, sumar Total personas acreditadas, no contar filas. Una fila puede representar al titular y varias cargas. Una persona que asistió dos fechas suma dos asistencias.

Invitados inscritos y acreditados se separan, al igual que cargas, acompañantes y otros invitados con nombre. Los invitados numéricos se muestran aparte: si la asistencia se guardó como cantidad, no es posible inventar el desglose de quiénes eran cargas y quiénes acompañantes.

El detalle solo incluye grupos presentes; las columnas de inscritos de Resumen abarcan todo el padrón de la fecha. Los totales de acreditados de ambas hojas sí deben coincidir.

El reporte general conserva las entradas reales aunque no haya inscripción para esa fecha y las acreditaciones históricas de personas eliminadas. El listado de invitados con nombre también se desglosa por fecha; muestra la fecha de ingreso y marca los registros eliminados. Un invitado precargado sin ninguna fecha asignada ni ingresos aparece como Sin fecha asignada.

Los datos declarados reflejan el padrón actual; no se reconstruyen versiones históricas que no se guardaron.

## Contadores

Dashboard, monitor y línea de tiempo suman los invitados numéricos que efectivamente llegaron. Los controles de cupo de participantes siguen contando solo titulares, con sus etiquetas correspondientes.

El corte Acreditados hoy usa el día real de America/Santiago. En cambios de hora puede durar 23 o 25 horas y no se asume un intervalo fijo de 24 horas.

La pantalla de reportes actualiza los contadores cada 20 segundos. La descarga obtiene un nuevo corte; durante el ingreso de personas puede diferir de una pantalla actualizada segundos antes. Comparar evento, fecha y momento de consulta.

## Centinela: acompañante adulto

La adaptación del evento Navidad Centinela vincula la pregunta estable q_tt2xyrl con un adulto declarado. Permite mostrarlo junto a cargas con nombre. No convierte la declaración en asistencia.

La pregunta debe marcarse Sí solo cuando el adulto no esté ya en la nómina. Como no se recoge su identidad, no se puede comprobar automáticamente esa duplicidad.

Tras desplegar, las primeras inscripciones nuevas sincronizan la respuesta automáticamente. Para los inscritos anteriores, ejecutar las consultas de docs/sql/centinela en orden: respaldo (guardar el resultado), actualización de declaraciones y verificación. Es una operación manual separada del build; no modifica las asistencias.

## Despliegue y validación

Usar el procedimiento habitual del proyecto para build y despliegue. Los cambios de reportes, importación, búsqueda y corte diario no necesitan migraciones de esquema ni actualización de asistencias.

Verificar con una persona con cargas numéricas, una con cargas con nombre y adulto, una con entradas en dos fechas y una cuyos invitados hayan ingresado sin el titular. Los totales deben representar las entradas efectivamente guardadas.

Las pruebas unitarias se ejecutan con npm test. La comprobación opcional con PostgreSQL local usa node scripts/verify-attendance-reports.cjs: requiere las dependencias de desarrollo y .env.local con DATABASE_URL de localhost. Trabaja solo con tablas temporales dentro de una transacción y revierte al terminar. No debe apuntarse a producción.

## Búsquedas y claridad de las pantallas

- La tabla de Participantes ignora respuestas antiguas cuando ya se lanzó otra consulta, incluso si se cambia de evento. Un error antiguo tampoco cancela el indicador de carga de la búsqueda vigente.
- En acreditación, una consulta fallida se muestra como error con Reintentar búsqueda. Solo una consulta correcta sin coincidencias muestra Sin resultados. Cambiar o limpiar el texto invalida inmediatamente respuestas anteriores.
- Los resultados se pueden seleccionar mediante botones accesibles con teclado. El acceso por RUT tiene una etiqueta asociada y anuncia sus errores.
- Las tarjetas de Eventos muestran inscritos y acreditados incluyendo invitados, con el desglose de titulares e invitados. Los totales suman fechas; no equivalen a personas únicas. El cupo de titulares se presenta separado, sin dividir la suma de asistencias de varias fechas por un cupo único.
- Horarios muestra día, mes, año y horas en America/Santiago.
- No publicado reemplaza la etiqueta Borrador: un evento privado puede tener inscripciones y acreditaciones válidas.
- El estado de invitados distingue agregar nuevos desde el formulario de conservar invitados precargados. Cambiar el texto no altera ninguna regla de admisión ni asistencia.
- El botón Reporte de Información del evento descarga XLSX con el mismo mecanismo que los otros botones; no guarda bytes Excel con extensión CSV.

## Revisión del 20 de noviembre: invitados, errores del panel y dietas

- Un enlace guest_schedules asigna al invitado a esa fecha. Sin enlaces, el fallback histórico requiere confirmed=true y una inscripción del titular en esa fecha. Los precargados sin confirmar no se suman como inscritos ni aparecen automáticamente para marcar. Los ingresos históricos se conservan aunque el invitado no figure inscrito.
- El endpoint por lotes devuelve error si fallan todos los reportes. Si la respuesta es parcial, el panel conserva los reportes disponibles y avisa qué eventos faltan. El aviso permite reintentar y las respuestas antiguas no reemplazan la página actual.
- Las dietas se consultan al abrir y cada minuto, junto al ciclo de actualización de reportes. Un fallo conserva la última consulta y muestra aviso hasta recuperarse. Los contadores mantienen su actualización cada 20 segundos.
- Requiere build y despliegue. No requiere migraciones ni cambia respuestas, invitados guardados o acreditaciones. Si un dato histórico no tiene ni enlace por fecha ni confirmación, no se infiere que esté inscrito: deberá revisarse y asignarse desde administración.
