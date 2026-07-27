# Reglas de trabajo — sesión de remediación

Reglas operativas del trabajo de corrección posterior a la **auditoría post-compromiso de julio
de 2026**. La fuente de verdad de *qué* hay que corregir es `AUDIT-FINDINGS.md` §7.3; este fichero
recoge *cómo* se trabaja.

Se versionan aquí porque hasta el **2026-07-27** vivían únicamente en el brief de arranque de la
sesión, es decir **fuera del repositorio**. Cualquiera que retome el trabajo con el árbol delante
y sin esa conversación no tenía forma de conocerlas — que es justo el modo de fallo que la
auditoría documenta una y otra vez: información operativa crítica que solo existía en un sitio, y
ese sitio no era el repositorio.

---

## W1 — Un hallazgo por commit

El mensaje referencia su ID (`fix(F3-01): ...`). Nada de comitear dos correcciones juntas, por
relacionadas que parezcan.

## W2 — Sin cambios fuera del alcance

Si aparece algo que arreglar de camino, **se anota en `SECURITY-BACKLOG.md` y se sigue**.
Refactorizar «ya que estoy aquí» es cómo una corrección de 30 minutos se convierte en una
regresión.

## W3 — Prueba ejecutable por corrección

Cada fix se entrega con el comando o test concreto que demuestra que funciona, **y** con la
comprobación de que el camino legítimo sigue operando. «Debería funcionar» no cuenta.

> **Ampliación del 2026-07-27 — W3 es ahora la única red de seguridad.** Con W7 inoperante
> (ver SB-11), cada corrección del Bloque A requiere **verificación a nivel HTTP contra una
> instancia corriendo**, no razonamiento sobre el código:
>
> - **La petición que debe fallar, fallando.** Ejemplo para A1: `curl` sin token → **401**.
> - **La petición legítima, funcionando.** Mismo endpoint con token válido → **200** y datos
>   correctos.
> - **Registrar el comando y su salida** en el mensaje de commit o en una nota adjunta.
> - Si un fix **no se puede verificar así**, decirlo **antes** de darlo por cerrado.

## W4 — Presupuesto de diagnóstico

Máximo **2 comandos** ante una discrepancia; después, detenerse y reportar. Comando que pase de
**60 s**: matar y reportar.

## W5 — Una corrección por turno

Al terminar, resumen breve y parada. No encadenar.

## W6 — Las dependencias van solas

A7 (subir Next.js) se hace primero y en su propio commit, **sin mezclar cambios de código**. Si
algo se rompe después, hay que poder saber si fue la versión o el fix.

## W7 — Tests antes y después

Comparar contra la línea base. Cualquier test que pase a fallar **detiene el trabajo**.

> **Estado real (2026-07-27): degradada, no operativa como red de seguridad.** La línea base es
> **6 suites, 6 fallidas, 0 tests ejecutados** — ver **SB-11**. No hay nada verde que proteger, así
> que W7 solo puede confirmar que la base no empeora (6 fallos antes, 6 después). **Si el número
> cambia, detenerse**: significa que un import se rompió de forma nueva. La carga de la prueba
> recae en W3.

## W8 — Texto multilínea sin expansión de shell

**Nunca** construir un mensaje de commit —ni ningún texto largo que pase por bash— como cadena
entre **comillas dobles**. Usar **heredoc entrecomillado** (`<<'EOF'`) o `git commit -F fichero`.

Dentro de comillas dobles, bash interpreta **backticks**, `$(...)`, `$VAR` y `!`.

```bash
# MAL — los backticks se ejecutan
git commit -m "requisito para que `npm ci` funcione"

# BIEN — nada se expande
git commit -F - <<'EOF'
requisito para que `npm ci` funcione
EOF
```

**Incidente que la origina (A7, 2026-07-27).** El mensaje de commit de A7 mencionaba `npm ci`,
`npm install`, `npm audit`, `npm run build`, `npm test` y `npx next start -p 3100` **entre
backticks**, dentro de un `-m "..."`. Bash **los ejecutó todos**. El comando agotó el timeout de
2 minutos y el commit no llegó a crearse; el primer diagnóstico fue buscar un hook de git que no
existía.

**El árbol quedó intacto, pero por suerte, no por control**: `npm ci` **borra `node_modules`
antes de reinstalar**, y se estaba ejecutando sobre el árbol recién actualizado a Next 16.2.12,
sin commit todavía que lo respaldara. Un fallo a mitad de esa reinstalación habría dejado el
directorio en un estado que no correspondía ni a la versión vieja ni a la nueva.

---

## Criterios transversales

**Ante discrepancia entre un documento y el código, gana el código.** El brief y el informe pueden
estar equivocados; el código no. Se aplica el cambio y **se rectifica la referencia** en el mismo
bloque que se está tocando.

**Un dato heredado sin verificar es un dato pendiente de verificar.** No adquiere autoridad por
venir de una fuente reputada ni por repetirse en varias secciones del informe. Ver `AUDIT-FINDINGS.md`
§7.0, sexta corrección, para el caso que estableció el criterio.

**Si una corrección resulta más grande de lo estimado, detenerse y reportar** antes de seguir. Una
estimación que se dobla suele significar que el hallazgo se entendió mal.

## Gestión del contexto

El Bloque A son ~12 h de trabajo: no cabe en una sesión. **Cortar entre correcciones, nunca a
mitad de una.** Para retomar basta con `AUDIT-FINDINGS.md`, este fichero y el último commit.
