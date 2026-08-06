# Decisiones de producto tomadas durante la ejecución nocturna

**Para Emmanuel, a revisar por la mañana.** Cada entrada es una decisión que el plan no traía
cerrada y que se tomó para no detener el trabajo. Ninguna es irreversible sin aviso: la columna
*Coste de cambiarla* dice qué implicaría revertirla.

## Cómo se toman

El criterio, fijado el **2026-08-05**, es **el equilibrio entre terminar cuanto antes y que el
producto quede suficientemente funcional para trabajarlo**. En la práctica:

1. **Se decide, no se pregunta.** Una decisión razonada y registrada vale más que una fase parada
   esperando respuesta.
2. **Gana la opción que desbloquea sin cerrar puertas.** Ante dos alternativas defendibles, la que
   se pueda cambiar después con menos trabajo.
3. **Se prefiere lo que ya afirma el código** a inventar comportamiento nuevo. Si el modelo declara
   un valor por defecto y el esquema declara otro, la decisión suele ser cuál de los dos vale, no
   cuál inventamos.
4. **No se sobre-construye.** Si algo es funcional con la mitad del trabajo, se hace la mitad y se
   registra la otra mitad como deuda.
5. **El crítico evalúa la decisión, no solo el código.** Si la considera equivocada, la corrige y
   deja constancia de ambas posturas — el desacuerdo es información, no ruido.

## Lo que NO se decide sola

Cualquier cosa que sea **destructiva o difícil de revertir**: borrar datos, reescribir la historia
de git, cambiar el modelo de datos de forma incompatible, o alterar lo que un usuario final ya ve
de manera que no se pueda deshacer. Eso se deja propuesto y **se espera**.

---

## Registro

> Cada plan añade sus filas aquí al terminar. Formato obligatorio: qué se decidió, por qué, qué se
> descartó y qué costaría cambiarla. Una decisión sin la alternativa descartada no está registrada,
> está afirmada.

| # | Plan · Fase | Decisión | Por qué | Alternativa descartada | Coste de cambiarla |
|---|---|---|---|---|---|
| **D0** | **Tomada por Emmanuel** · 2026-08-06 | **Base de datos administrada de DigitalOcean**, no PostgreSQL en el droplet | El servidor anterior se comprometió y hubo que destruirlo **sin snapshot**. Con la base en la misma máquina, los datos mueren con ella. Backups y parches gestionados, y sobrevive a un redespliegue del droplet | **PostgreSQL local con backups propios.** Descartada porque «como la vez anterior» significa que la vez anterior **no había backups**, y montarlos, probar que restauran y vigilarlos es trabajo recurrente que se abandona a los meses | **Alto una vez haya datos reales**: migrar una base en producción. Barato ahora, antes del primer evento |
| **D1.1** | 01 · Fase 1 | **El cupo por defecto pasa de 0 a 2**, en `eventSchemas.ts:97` y en `EventForm.tsx`. `0` sigue siendo válido, pero hay que **escribirlo**: significa «sin invitados» | El `.default(0)` del esquema pisaba el `defaultValue: 2` del modelo, así que **todo evento creado desde la aplicación nacía con cupo 0** y el registro descartaba a todos los acompañantes. Medido: mismo formulario, mismo campo sin tocar → `0` antes, `2` después | **Que `0` signifique «sin configurar» y el handler lo tradujera a 2 al vuelo.** Descartada porque deja dos significados en el mismo valor: un organizador que escriba 0 a propósito no podría expresar «sin invitados», y el dato guardado seguiría mintiendo sobre lo que el evento permite | **Baja.** Es un `.default()` en un sitio y el valor inicial del formulario. Los eventos ya creados conservan su valor: la decisión no reescribe nada |
| **D1.2** | 01 · Fase 1 | **Las cargas precargadas por el organizador NO consumen el cupo del asistente.** Se distinguen con la columna nueva `guests.registration_source` (`MANUAL` / `IMPORT` / `PUBLIC_FORM`); el handler cuenta solo `PUBLIC_FORM` | `guestType` no servía: es una etiqueta libre que el administrador configura por evento. Sin columna no hay forma de distinguirlas, y contándolas un precargado con 2 cargas y cupo 2 **nunca** podía traer acompañante — el fallo que la fase arregla. Medido: 2 cargas + acompañante → 2 filas antes, 3 después | **Restar las cargas del cupo en vez de excluirlas** (cupo efectivo = máximo − cargas). Descartada porque es la misma cuenta con otro nombre: sigue dejando sin acompañante a quien tiene cargas hasta el tope, que es justo el caso roto | **Media.** La columna es aditiva y no destructiva (`ADD COLUMN IF NOT EXISTS`, defecto `MANUAL`), pero revertir exigiría decidir qué hacer con las filas ya marcadas `PUBLIC_FORM` |
| **D1.3** | 01 · Fase 1 | **Cuando llegan más invitados que cupo, se aceptan los que caben y la respuesta lo dice**: el 201 lleva `guestsCreated`, `guestsSkipped` y `guestCap`, y las dos landings lo muestran en pantalla | Rechazar la inscripción entera castiga al asistente por un límite que la interfaz no le enseñó. Descartar en silencio es lo que había, y es lo que produjo el **correo que listaba acompañantes que nunca se guardaron** | **Devolver 400 y rechazar la inscripción completa.** Descartada porque el participante pierde su inscripción por un invitado sobrante, y porque el cliente ya no ofrece más casillas de las que caben: llegar al tope requiere saltarse la interfaz | **Baja.** Son tres campos añadidos a una respuesta; ningún cliente existente los exigía |
| **D2.1** | 01 · Fase 2 | **Un participante ya inscrito no recibe NINGÚN invitado nuevo de la petición**, además de no ver modificados los suyos. La invariante queda en una línea: si `existingScheduleIds.length > 0`, solo se enlaza la fecha nueva | El plan nombraba dos escrituras (el recorte de `guestCount`/`guestLoads` y la rama `g.id`); la creación de invitados nuevos era una tercera que no nombraba. Crear filas en la ficha de otra persona es escribir en sus datos aunque no sobrescriba ninguna columna, y el disparador es el mismo: `lookup` entrega `participantId` y los `id` de las cargas **sin autenticación** a quien acierte un RUT | **Dejar viva la creación de invitados en fechas adicionales**, por si alguien se inscribe a una segunda fecha con acompañante. Descartada porque abre por defecto un camino de escritura no autenticada para salvar un caso que el plan no reclama, y porque contradice la decisión que el propio código ya tomaba: quien ya está inscrito no se modifica solo, contacta con una persona | **Baja.** Es mover la llamada fuera del `else`. Si el caso multi-fecha con acompañante resulta necesario, se reabre con su propia verificación |
| **D3.1** | 01 · Fase 3 | **Los topes se derivan de la columna (255) y la columna NO se amplía.** `dietary_comments` sigue siendo `VARCHAR(255)` | D1.5 admitía ampliar a TEXT si la columna se quedaba corta, pero la propia verificación exigida por la fase 3 dice «comentario de 300 caracteres → 400 con mensaje claro»: ampliar la columna haría que 300 se guardara y **contradiría el criterio de aceptación del plan**. 255 caracteres son ~3 frases, suficientes para describir una alergia, y el freno ahora se ve en el formulario (`maxLength`) en vez de descubrirse al enviar | **Ampliar `dietary_comments` a TEXT** con una migración aditiva como la de la fase 1. Descartada por lo anterior y porque agranda el cambio sin que nadie haya pedido más espacio: la deuda queda anotada y es barata de revertir si aparece un caso real | **Baja.** Ampliar después es `ALTER TABLE ... TYPE TEXT`, aditivo y sin pérdida; solo habría que subir el `.max()` a la vez |
| **D1.4** | 01 · Fase 1 | **Las cargas precargadas se reenvían con su `id`** y se muestran en modo lectura en `PublicRegistrationForm` | Se reenviaban **sin `id`**, así que el servidor las recreaba: un duplicado por inscripción. El tope de invitados lo tapaba, no lo corregía — en cuanto D1.2 dejó de contarlas, habría vuelto a duplicar | **Arreglarlo en un plan aparte.** Descartada porque D1.2 y este bug están acoplados: cerrar D1.2 sin esto es reintroducir a sabiendas un fallo conocido | **Baja.** Es el `id` en el mapeo del lookup y en el envío |

---

## Valores por defecto ya razonados

Estos no salen de la nada: son el punto de partida que cada plan lleva escrito, para que el
implementador no tenga que inventarlos y el crítico tenga contra qué contrastar. **Si el código
desmiente el razonamiento, gana el código** y la decisión se anota rectificada.

| Asunto | Valor por defecto | Razonamiento |
|---|---|---|
| Cupo de invitados cuando el evento no declara máximo | **2** (el `defaultValue` del modelo) | `Event.ts:99-102` ya lo declara; el `.default(0)` del esquema es lo que lo pisa. Elegir 2 devuelve el comportamiento que el producto tenía antes, que es «suficientemente funcional» |
| Cargas precargadas frente al cupo del asistente | **No lo consumen** | Son presupuesto del organizador, no del asistente. Con la lectura contraria, un precargado con cargas nunca puede traer acompañante — que es el fallo actual |
| Límite general de la API por IP | **~600/min**, revisable | Seis puestos × 3 personas/min × 14 peticiones ≈ 250/min. El doble deja margen para picos sin volver al 166 req/s original |
| Cota de reintento tras un 401 | **1** | Si el segundo intento también falla, el problema no es el token |
| `SameSite` de las cookies | **`Lax`** | `Strict` rompe la vuelta desde un enlace de correo, y el producto manda correos de confirmación |
| Base de datos en los tests | **Contenedor efímero** | Los fallos que esta remediación introdujo son de comportamiento contra la base; un mock no los habría visto |
| Umbral de cobertura | **El que haya al ponerlos en verde**, subiendo después | Un 80 % de golpe genera test de relleno. Mejor un número real que suba que uno alto que se ignora |
| Correo de contacto configurable | **De build, documentado** | Hacerlo dinámico obliga a servirlo desde el servidor; el valor cambia una vez al año |
| Gestor de procesos | **systemd, un proceso** | PM2 en cluster multiplica los contadores del limitador y no lee `EnvironmentFile` |
| Historia de git y el volcado | **Solo destrackear**, sin reescribir | Reescribir invalida los clones y no borra lo ya publicado. **Requiere confirmación de Emmanuel** |
