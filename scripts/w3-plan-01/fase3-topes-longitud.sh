#!/usr/bin/env bash
# Batería W3 de R1-03 (fase 3). Igual contra ANTES y DESPUÉS.
# Uso: bash w3-fase3.sh <etiqueta> <slug> <sch> <idAlergia> <idComentario> <idPrefLarga> <prefLarga>
set -u
BASE="http://localhost:3100/api/public/events"
ETI="$1"; SLUG="$2"; SCH="$3"; P_ALE="$4"; P_COM="$5"; P_PRE="$6"; PREF="$7"
PSQL="docker exec acreditacion_pg_local psql -U postgres -d acreditacion -At -c"

echo "==================== FASE 3 · $ETI ===================="

# 200 caracteres de detalle de alergia. El cliente compone «Alergia: <detalle>».
DET200=$(node -e 'process.stdout.write("mani ".repeat(40).slice(0,200))')
COM300=$(node -e 'process.stdout.write("alergia severa ".repeat(25).slice(0,300))')
echo "longitudes -> detalle alergia=${#DET200}  comentario=${#COM300}  preferencia guardada=${#PREF}"

echo; echo "--- T1  alergia de 200 caracteres (participante E invitado) → debe GUARDARSE ---"
curl -s -X POST "$BASE/$SLUG/register" -H "Content-Type: application/json" -H "Origin: http://localhost:3100" \
  -d "$(node -e '
const [p,sch,det]=process.argv.slice(1);
process.stdout.write(JSON.stringify({participantId:p,scheduleIds:[sch],firstName:"Dieta",lastName:"alergia",email:"dieta.alergia@example.com",
  dietaryPreference:"Alergia", dietaryComments:det,
  guests:[{firstName:"Inv",lastName:"Alergico",dietaryPreference:"Alergia: "+det}]}));
' "$P_ALE" "$SCH" "$DET200")" -w "\nHTTP=%{http_code}\n"
echo "  participante: $($PSQL "select 'len(dietary_comments)='||coalesce(length(dietary_comments),0) from participants where id='$P_ALE';")"
echo "  invitado    : $($PSQL "select coalesce(string_agg(first_name||' len(dietary_preference)='||coalesce(length(dietary_preference),0),' | '),'(NINGUNO)') from guests where participant_id='$P_ALE';")"

echo; echo "--- T2  comentario de dieta de 300 caracteres → 400 con mensaje, NUNCA 500 ---"
curl -s -X POST "$BASE/$SLUG/register" -H "Content-Type: application/json" -H "Origin: http://localhost:3100" \
  -d "$(node -e '
const [p,sch,com]=process.argv.slice(1);
process.stdout.write(JSON.stringify({participantId:p,scheduleIds:[sch],firstName:"Dieta",lastName:"comentario",email:"dieta.comentario@example.com",
  dietaryPreference:"Alergia", dietaryComments:com}));
' "$P_COM" "$SCH" "$COM300")" -w "\nHTTP=%{http_code}\n"
echo "  inscrito? : $($PSQL "select count(*) from participant_schedules where participant_id='$P_COM';") (0 = rechazado, como debe)"

echo; echo "--- T3  precargado cuya PREFERENCIA GUARDADA mide ${#PREF} caracteres → debe poder inscribirse ---"
curl -s -X POST "$BASE/$SLUG/register" -H "Content-Type: application/json" -H "Origin: http://localhost:3100" \
  -d "$(node -e '
const [p,sch,pref]=process.argv.slice(1);
process.stdout.write(JSON.stringify({participantId:p,scheduleIds:[sch],firstName:"Dieta",lastName:"preflarga",email:"dieta.preflarga@example.com",
  dietaryPreference:pref}));
' "$P_PRE" "$SCH" "$PREF")" -w "\nHTTP=%{http_code}\n"
echo "  inscrito? : $($PSQL "select count(*) from participant_schedules where participant_id='$P_PRE';") (1 = pudo inscribirse)"

echo; echo "==================== fin fase 3 · $ETI ===================="
