# Ejecuta varios planes de remediacion en cadena, sin supervision.
#
# Cada plan corre en uno de dos modos:
#   workflow  -> lanza planes/ejecutar-plan.workflow.js, que garantiza el ciclo
#                implementador -> critico con agentes de contexto limpio y salida forzada por
#                esquema. Mas caro en tokens; es lo que compra la independencia de la critica.
#   directo   -> una sesion de Claude Code que sigue el metodo del plan por su cuenta. Mas
#                barato, menos garantias: el mismo modelo que escribe el codigo se revisa.
#
# El Workflow no se invoca desde la linea de comandos: vive dentro de Claude Code. Por eso el
# modo "workflow" lanza igualmente `claude`, con la instruccion de arrancarlo y esperarlo.
#
# Uso:
#   pwsh planes/ejecutar-noche.ps1                        # los 3 que bloquean el despliegue
#   pwsh planes/ejecutar-noche.ps1 -Conjunto todos        # los 8, en orden de dependencias
#   pwsh planes/ejecutar-noche.ps1 -SoloPrecondiciones    # comprueba, lista y sale
#   pwsh planes/ejecutar-noche.ps1 -TodoDirecto           # sin workflows, mas barato
#   pwsh planes/ejecutar-noche.ps1 -Conjunto personalizado -Planes @('03-bloque-b-sesion')
#
# Por que en cadena y no en paralelo: los planes comparten la rama de git, la base de datos
# (db:sync borra las 16 tablas), el puerto de la aplicacion y el directorio .next. En paralelo
# esos cuatro recursos se pisan y producen fallos que PARECEN bugs del codigo. De noche el
# tiempo de reloj no es el recurso escaso. Ver planes/PARALELO.md si aun asi hace falta.

# PositionalBinding=$false a proposito: sin el, `-Planes a,b` enlaza el segundo elemento al
# siguiente parametro posicional ($Contenedor) y el script intenta arrancar un contenedor que se
# llama como un plan. Obligar a nombrar todos los parametros lo hace imposible.
[CmdletBinding(PositionalBinding = $false)]
param(
    # Que conjunto se ejecuta:
    #   bloqueantes -> 01, 02, 08. Los tres que impiden desplegar. Es el defecto.
    #   todos       -> los ocho, en orden de dependencias.
    #   <lista>     -> -Conjunto personalizado -Planes @('03-bloque-b-sesion')
    [ValidateSet('bloqueantes', 'todos', 'personalizado')]
    [string] $Conjunto = 'bloqueantes',

    [string[]] $Planes = @(),
    [string] $Contenedor = 'acreditacion_pg_local',
    [switch] $SoloPrecondiciones,
    [switch] $TodoDirecto,
    [switch] $PararSiFalla
)

# --- Catalogo de planes -------------------------------------------------------------
# El ORDEN de esta tabla no es estetico: respeta las dependencias reales entre planes.
# Cambiarlo sin mirar la columna "depende" produce merges dolorosos o fases que se paran
# porque la linea base cambio bajo sus pies.

$CATALOGO = @(
    @{ nombre = '01-regresiones-bloque-a';      modo = 'workflow'; bloqueante = $true;  depende = '';
       nota = 'Fallos activos que introdujo la remediacion. Critica independiente: si.' }

    @{ nombre = '02-limitador-auth';            modo = 'workflow'; bloqueante = $true;  depende = '';
       nota = 'DoS de cuenta y puerta caida. Critica independiente: si.' }

    @{ nombre = '08-precondiciones-despliegue'; modo = 'directo';  bloqueante = $true;  depende = '';
       nota = 'Va ANTES del 07: es lo que haria fallar la reconstruccion.' }

    @{ nombre = '03-bloque-b-sesion';           modo = 'directo';  bloqueante = $false; depende = '';
       nota = 'Independiente de los demas.' }

    @{ nombre = '04-bloque-b-validacion';       modo = 'directo';  bloqueante = $false; depende = '01';
       nota = 'Se solapa con el 01 en los .max() de los validadores. Despues del 01.' }

    @{ nombre = '05-cookies-cors';              modo = 'workflow'; bloqueante = $false; depende = '08';
       nota = 'El 08 decide la fuente unica de cabeceras; este construye encima. Sus dos mitades no se pueden separar sin abrir un agujero: por eso workflow.' }

    @{ nombre = '06-resucitar-tests';           modo = 'directo';  bloqueante = $false; depende = '';
       nota = 'PENULTIMO A PROPOSITO: al poner tests en verde CAMBIA la linea base de W7 (hoy 6/6 fallidas) que los demas planes usan como criterio de parada.' }

    @{ nombre = '07-reconstruccion-droplet';    modo = 'directo';  bloqueante = $false; depende = '08';
       nota = 'PARCIAL. Sus fases 1-3 se automatizan; la fase 4 es supervisada por definicion (ejecutar contra el servidor real). El prompt le dice que pare antes.' }
)

$BLOQUEANTES = @('01-regresiones-bloque-a', '02-limitador-auth', '08-precondiciones-despliegue')

# Resolver el conjunto pedido conservando SIEMPRE el orden del catalogo.
$seleccion = switch ($Conjunto) {
    'todos'         { $CATALOGO }
    'personalizado' {
        if ($Planes.Count -eq 0) { Write-Host 'Con -Conjunto personalizado hay que pasar -Planes' -ForegroundColor Red; exit 1 }
        # Invocado con -File, PowerShell entrega "a,b" como UN solo string en vez de un array.
        # Se normalizan las dos formas para que funcione igual desde .ps1 y desde una sesion.
        $pedidos = $Planes | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ }
        $desconocidos = $pedidos | Where-Object { $n = $_; -not ($CATALOGO | Where-Object { $_.nombre -eq $n }) }
        if ($desconocidos) {
            Write-Host "Planes desconocidos: $($desconocidos -join ', ')" -ForegroundColor Red
            Write-Host "Disponibles: $(($CATALOGO | ForEach-Object { $_.nombre }) -join ', ')" -ForegroundColor Gray
            exit 1
        }
        $CATALOGO | Where-Object { $pedidos -contains $_.nombre }
    }
    default         { $CATALOGO | Where-Object { $BLOQUEANTES -contains $_.nombre } }
}

if ($seleccion.Count -eq 0) { Write-Host 'Ningun plan seleccionado.' -ForegroundColor Red; exit 1 }

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$marca = Get-Date -Format 'yyyy-MM-dd_HHmm'
$dirLogs = Join-Path $raiz 'planes\resultados\logs'
if (-not (Test-Path $dirLogs)) { New-Item -ItemType Directory -Path $dirLogs -Force | Out-Null }

function Escribir($texto, $color = 'White') {
    $sello = Get-Date -Format 'HH:mm:ss'
    Write-Host "[$sello] $texto" -ForegroundColor $color
    Add-Content -Path (Join-Path $dirLogs "sesion-$marca.log") -Value "[$sello] $texto" -Encoding utf8
}

# --- Precondiciones -----------------------------------------------------------------
# Se comprueban ANTES de lanzar nada: un plan que arranca sin entorno no puede cumplir W3, y
# descubrirlo a las 4 de la manana significa perder la noche entera.

Escribir 'Comprobando precondiciones' 'Cyan'
$problemas = @()

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    $problemas += "El CLI 'claude' no esta en el PATH."
}

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { $problemas += 'Docker no responde. Arranca Docker Desktop.' }

$sucio = git status --porcelain | Where-Object { $_ -notmatch 'AUDIT-PLAN.md' }
if ($sucio) {
    $problemas += "El arbol tiene cambios sin commitear. Cada plan commitea lo suyo y un arbol sucio los mezcla:`n$($sucio -join "`n")"
}

if (-not (Test-Path (Join-Path $raiz '.env'))) {
    $problemas += 'No hay .env en la raiz. Los scripts de BD lo necesitan (ya no se versiona).'
}

foreach ($p in $seleccion) {
    if (-not (Test-Path (Join-Path $raiz "planes\$($p.nombre).md"))) {
        $problemas += "No existe planes/$($p.nombre).md"
    }
}

# Aviso, no error: ejecutar un plan cuya dependencia no va en esta tanda se puede querer a
# proposito, pero conviene saberlo antes y no descubrirlo en el merge.
$nombresTanda = $seleccion | ForEach-Object { $_.nombre }
foreach ($p in $seleccion) {
    if ($p.depende -and -not ($nombresTanda | Where-Object { $_ -like "$($p.depende)-*" })) {
        Escribir "AVISO: $($p.nombre) depende del plan $($p.depende), que no va en esta tanda." 'Yellow'
    }
}

if ($problemas.Count -gt 0) {
    Escribir 'NO SE PUEDE EMPEZAR:' 'Red'
    $problemas | ForEach-Object { Escribir "  - $_" 'Red' }
    exit 1
}

Escribir "Rama: $(git rev-parse --abbrev-ref HEAD)  | commit: $(git rev-parse --short HEAD)" 'Gray'
Escribir "Conjunto '$Conjunto' -> $($seleccion.Count) de $($CATALOGO.Count) planes:" 'Gray'
foreach ($p in $seleccion) {
    Escribir "   $($p.nombre)  [$($p.modo)]$(if ($p.bloqueante) { '  BLOQUEA EL DESPLIEGUE' })" 'Gray'
}

# El contenedor se levanta una vez para toda la cadena; cada plan siembra lo que necesite.
docker start $Contenedor 2>&1 | Out-Null
$listo = $false
foreach ($i in 1..30) {
    docker exec $Contenedor pg_isready -U postgres 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { $listo = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $listo) { Escribir "PostgreSQL no responde en el contenedor $Contenedor" 'Red'; exit 1 }
Escribir 'PostgreSQL listo' 'Green'

if ($SoloPrecondiciones) {
    Escribir 'Precondiciones OK. Nada que ejecutar (-SoloPrecondiciones).' 'Green'
    exit 0
}

# --- Prompts ------------------------------------------------------------------------
# Autocontenidos a proposito: cada sesion arranca sin contexto de las anteriores.

$comunes = @'
DECISIONES DE PRODUCTO: se toman, no se preguntan. El plan trae valores por defecto razonados;
usalos salvo que el codigo los desmienta, y entonces gana el codigo. Registra CADA una en
planes/DECISIONES.md con su alternativa descartada y el coste de cambiarla.
Lo destructivo o irreversible (borrar datos, reescribir historia de git, cambios incompatibles
del modelo) NO se decide solo: se propone en la seccion "Esperan tu respuesta" y sigues.

La linea base de tests es 6 suites fallidas / 6 / 0 tests. Si cambia, para.

No preguntes nada por el camino: no hay nadie delante. Ante la duda, decide con el criterio de
terminar cuanto antes y que el producto quede suficientemente funcional para trabajarlo, y deja
constancia.
'@

function PromptWorkflow($plan, $marca) {
    return @"
Quiero que uses una workflow para esto. Invoca:

  Workflow({ scriptPath: "planes/ejecutar-plan.workflow.js", args: { plan: "$plan" } })

IMPORTANTE: la workflow corre en segundo plano. NO termines tu turno hasta recibir su
notificacion de finalizacion y haber leido su resultado. Si tarda, espera.

Cuando termine, comprueba tu mismo que hizo lo que dice: mira `git log --oneline` y el diff de
los commits nuevos, y confirma que planes/DECISIONES.md tiene las filas de las decisiones
tomadas. Si la workflow fallo o no dejo nada, dilo claramente en tu respuesta final en vez de
darla por buena.

Contexto del plan: planes/$plan.md, metodo en planes/README.md, reglas en REMEDIATION-RULES.md.

$comunes
"@
}

function PromptDirecto($plan, $marca) {
    return @"
Ejecuta el plan planes/$plan.md del repositorio, siguiendo el metodo de planes/README.md.

OBLIGATORIO:
- Lee primero planes/README.md, REMEDIATION-RULES.md y el plan entero.
- Fase por fase, en orden. Cada fase: implementas, verificas de VERDAD (W3: levanta el entorno,
  ejecuta los comandos, pega la salida real) y commiteas con W1 y W8.
- Al terminar cada fase, ANTES de pasar a la siguiente, lanza un subagente CRITICO independiente
  que reciba el diff real de esa fase y NO tu razonamiento. Su trabajo no es aprobar, es
  comprobar: que refute lo que no se sostenga, evalue tus decisiones de producto y diga si la
  fase se cierra o se rehace. Si dice rehacer, PARA el plan ahi en vez de arrastrar el error.
- Al terminar, escribe planes/resultados/$plan-$marca.md con: que quedo funcionando, que no, que
  refuto el critico y que queda pendiente.

$comunes
"@
}

# --- Cadena -------------------------------------------------------------------------

$resultados = @()
$commitInicial = git rev-parse HEAD

foreach ($p in $seleccion) {
    $plan = $p.nombre
    $modo = if ($TodoDirecto) { 'directo' } else { $p.modo }

    Escribir ''
    Escribir "=== PLAN $plan  (modo: $modo) ===" 'Cyan'
    if ($p.nota) { Escribir "    $($p.nota)" 'DarkGray' }
    $commitAntes = git rev-parse HEAD
    $logPlan = Join-Path $dirLogs "$plan-$marca.log"

    $prompt = if ($modo -eq 'workflow') { PromptWorkflow $plan $marca } else { PromptDirecto $plan $marca }

    # El 07 lleva una fase que exige a alguien delante: ejecutar el aprovisionamiento contra el
    # droplet real. Un script sin probar es una hipotesis con aspecto de certeza, asi que de
    # noche se escribe y se valida en seco, y ahi para.
    if ($plan -like '07-*') {
        $prompt += "`n`nIMPORTANTE PARA ESTE PLAN: ejecuta SOLO las fases 1, 2 y 3. La fase 4 exige"
        $prompt += "`nun droplet real delante y NO se ejecuta de noche. Escribe el script de"
        $prompt += "`naprovisionamiento y validalo EN SECO (bash -n, shellcheck, nginx -t dentro de un"
        $prompt += "`ncontenedor, systemd-analyze verify, y ejecutarlo dos veces en un contenedor Ubuntu"
        $prompt += "`nlimpio para comprobar que es idempotente). No intentes conectar con ningun servidor."
    }

    # El 06 pone la suite en verde, y con ello cambia la linea base de W7 que el resto usa como
    # criterio de parada. Si alguien lo mete antes de tiempo, que al menos quede escrito.
    if ($plan -like '06-*') {
        $prompt += "`n`nIMPORTANTE PARA ESTE PLAN: al terminar, si la linea base de tests deja de ser"
        $prompt += "`n'6 suites fallidas / 6 / 0 tests', ACTUALIZALA en REMEDIATION-RULES.md (regla W7) y"
        $prompt += "`nen planes/README.md, y dilo en tu informe. Los demas planes la usan como criterio de"
        $prompt += "`nparada y se detendrian creyendo que rompieron algo."
    }

    Escribir "Lanzando claude (log: $(Split-Path -Leaf $logPlan))" 'Gray'
    $inicio = Get-Date

    # --permission-mode acceptEdits: sin nadie delante, un prompt de permiso cuelga la noche.
    & claude -p $prompt --permission-mode acceptEdits *>&1 | Tee-Object -FilePath $logPlan
    $codigo = $LASTEXITCODE

    $duracion = [int]((Get-Date) - $inicio).TotalMinutes
    $commitsNuevos = git rev-list "$commitAntes..HEAD" --count

    # Un codigo de salida 0 no significa que el plan hiciera algo: si no hay commits nuevos,
    # o la sesion se fue por otro camino o el plan estaba ya hecho. Conviene verlo en el resumen.
    $estado = if ($codigo -ne 0) { "fallo (codigo $codigo)" }
              elseif ([int]$commitsNuevos -eq 0) { 'terminado SIN COMMITS' }
              else { 'terminado' }

    Escribir "Plan ${plan}: $estado |$commitsNuevos commits |$duracion min" `
        $(if ($estado -eq 'terminado') { 'Green' } else { 'Yellow' })

    $resultados += [pscustomobject]@{
        Plan = $plan; Modo = $modo; Estado = $estado; Commits = $commitsNuevos; Minutos = $duracion
    }

    if ($codigo -ne 0 -and $PararSiFalla) {
        Escribir 'Se detiene la cadena (-PararSiFalla)' 'Yellow'
        break
    }
}

# --- Resumen ------------------------------------------------------------------------

Escribir ''
Escribir '=== RESUMEN DE LA NOCHE ===' 'Cyan'
$resultados | Format-Table -AutoSize | Out-String | ForEach-Object { Escribir $_ }

$totalCommits = git rev-list "$commitInicial..HEAD" --count
Escribir "$totalCommits commits nuevos en total"
Escribir ''
Escribir 'Por la manana:' 'Yellow'
Escribir '  1. planes/DECISIONES.md   <- las decisiones de producto, para verificar' 'Yellow'
Escribir '  2. planes/resultados/     <- el informe de cada plan' 'Yellow'
Escribir "  3. git log --oneline $($commitInicial.Substring(0,7))..HEAD" 'Yellow'

$filas = ($resultados | ForEach-Object { "| $($_.Plan) | $($_.Modo) | $($_.Estado) | $($_.Commits) | $($_.Minutos) |" }) -join "`n"
$resumen = Join-Path $raiz "planes\resultados\RESUMEN-$marca.md"
@"
# Ejecucion nocturna — $marca

Commit de partida: ``$commitInicial``
Commits nuevos: **$totalCommits**

| Plan | Modo | Estado | Commits | Minutos |
|---|---|---|---|---|
$filas

## Que revisar

1. **planes/DECISIONES.md** — las decisiones de producto que se tomaron. Mira primero las
   marcadas como corregidas por el critico y las que esperan tu respuesta.
2. **planes/resultados/** — un informe por plan.
3. ``git log --oneline $commitInicial..HEAD``

Un plan "terminado SIN COMMITS" no hizo nada: o se fue por otro camino o ya estaba hecho.
Merece una mirada al log antes de darlo por bueno.

## Si algo salio mal

Los logs completos estan en ``planes/resultados/logs/``. Ninguna fase hace push: todo esta en
local y se puede revertir con ``git reset --hard $commitInicial``.
"@ | Set-Content -Path $resumen -Encoding utf8

Escribir "Resumen escrito en $resumen" 'Green'
