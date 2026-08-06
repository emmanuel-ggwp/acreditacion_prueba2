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
| — | — | *(vacío hasta la primera ejecución)* | | | |

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
