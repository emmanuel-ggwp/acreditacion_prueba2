# Plan 06 — SB-11: devolver la red de seguridad

> **No bloquea el redespliegue, pero condiciona todo lo demás.** Mientras la suite siga en rojo,
> cada corrección depende por completo de verificación manual (W3), y una regresión solo se detecta
> si a alguien se le ocurre probar ese camino concreto. Varios de los fallos que la remediación
> introdujo —el cupo de invitados a 0, la doble cabecera `Authorization`— son exactamente el tipo de
> cosa que un test habría cazado.

**Estado:** 6 suites, 6 fallidas, **0 tests ejecutados**. Es la línea base de W7 desde el
2026-07-27.

**Causa única y conocida:** los modelos llaman a `Model.init()` al importarse, y bajo Jest no hay
instancia de Sequelize, así que la importación revienta en `src/models/index.ts`. No es que los
tests fallen: es que **no llegan a ejecutarse**.

---

## Fase 1 — Que las suites arranquen

Decidir el enfoque **antes** de escribir nada, porque condiciona todo lo demás:

- **Mock de Sequelize** en `jest.setup.js` — barato, pero cada modelo nuevo puede volver a romperlo,
  y ya hay un mock parcial (`{ sequelize: { transaction, define, sync, query } }`) que es
  precisamente el que no basta.
- **Base de datos real de test** (contenedor efímero) — más lento y más fiel; permite probar de
  verdad los servicios y las transacciones, que es donde están los fallos que importan.
- **Inicialización perezosa de los modelos** — ataca la causa en vez del síntoma, pero es un cambio
  estructural sobre todo `src/models/`, de alcance incierto. Es la razón por la que se aplazó.

**Recomendación de partida, a confirmar por el crítico:** contenedor efímero. Los tres fallos que
esta remediación introdujo son de comportamiento contra la base de datos —un cupo mal calculado, una
escritura que no debía ocurrir—, y un mock no los habría detectado.

**Verificación:** las 6 suites **ejecutan**. Que pasen o no es la fase 2; aquí el criterio es que
Jest llegue a correr los tests.

---

## Fase 2 — Que los tests existentes pasen, o retirarlos con criterio

Con las suites arrancando, verán la verdad por primera vez en meses. Algunos fallarán porque el
código cambió y el test quedó obsoleto; otros porque encontraron algo. **Hay que distinguirlo caso
por caso** y no "arreglar" un test hasta entender por qué falla: un test que se ajusta para pasar
sin entender el fallo es peor que no tenerlo.

Ojo con dos cosas concretas: los tests de `login` y `register` importan el handler real, que ahora
carga el limitador; y `jest.config.js` exige **80 % de cobertura** sobre `src/services/**` y
`src/app/api/**`, umbral que hoy no se está midiendo contra nada.

---

## Fase 3 — Cubrir lo que la remediación tocó

Una vez verde, escribir los tests que habrían evitado los fallos de esta sesión. Son la
especificación de lo que no puede volver a romperse:

- **Registro público**: precargado no inscrito completa datos; **ya inscrito no se modifica**;
  acompañante se crea con el cupo por defecto del producto; el tope corta a partir del cupo.
- **Autorización**: cada endpoint que cambió, con los cuatro roles, en los dos sentidos.
- **Limitador**: fuerza bruta se corta; **la víctima legítima puede entrar** (el caso que faltaba);
  el tráfico de una sede no se autobloquea.
- **Validación de entorno**: aborta sin variables críticas, arranca con ellas.

**Verificación:** cada test se escribe **primero contra el código roto** —revirtiendo mentalmente
el arreglo— para comprobar que falla. Un test que nunca se vio fallar no prueba nada.

---

## Decisiones de producto — se toman, no se preguntan

Se registran en [DECISIONES.md](DECISIONES.md) y el crítico las evalúa.

| # | Decisión | Valor por defecto | Razonamiento |
|---|---|---|---|
| D6.1 | Base de datos en los tests | **Contenedor efímero** | Los tres fallos que esta remediación introdujo son de comportamiento **contra la base de datos**: un cupo mal calculado, una escritura que no debía ocurrir. Un mock no habría visto ninguno |
| D6.2 | Umbral de cobertura | **El real que resulte al ponerlos en verde**, subiendo después | Exigir 80 % de golpe genera test de relleno sin valor. Un número real que sube vale más que uno alto que se ignora — que es justo lo que lleva meses pasando |
| D6.3 | ¿Los tests entran en CI desde el principio? | **Sí, pero sin bloquear el merge** hasta que estén verdes dos semanas | Si entran rojos y bloqueando, se desactivan a la primera urgencia y CI nace ignorado, que es como se llegó hasta aquí |
| D6.4 | Qué se cubre primero | **Lo que esta remediación tocó y rompió** | Son la especificación de lo que no puede volver a romperse, y ya se sabe que fallaban: cada test se escribe primero contra el código roto para verlo fallar |

**No se decide solo:** nada de este plan afecta a producción.
