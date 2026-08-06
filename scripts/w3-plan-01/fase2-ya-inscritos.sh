#!/usr/bin/env bash
# Batería W3 de R1-02 (fase 2). Se ejecuta igual contra ANTES y DESPUÉS.
# Uso: bash w3-fase2.sh <etiqueta> <slug> <sch1> <sch2> <victimaId> <g1> <g2> <legitimoId> <g3>
set -u
BASE="http://localhost:3100/api/public/events"
ETI="$1"; SLUG="$2"; S1="$3"; S2="$4"; VIC="$5"; G1="$6"; G2="$7"; LEG="$8"; G3="$9"
PSQL="docker exec acreditacion_pg_local psql -U postgres -d acreditacion -At -c"

echo "==================== FASE 2 · $ETI ===================="

estado_victima() {
  echo "  participante : $($PSQL "select 'guest_count='||guest_count||' guest_loads='||guest_loads||' guest_companion='||guest_companion||' dietary_comments='||coalesce(dietary_comments,'-') from participants where id='$VIC';")"
  echo "  cargas       : $($PSQL "select string_agg(first_name||' '||last_name||' -> '||case when schedule_id='$S1' then 'FECHA1' when schedule_id='$S2' then 'FECHA2' else coalesce(schedule_id::text,'null') end,' | ' order by created_at) from guests where participant_id='$VIC';")"
  echo "  nº invitados : $($PSQL "select count(*) from guests where participant_id='$VIC';")"
  echo "  fechas       : $($PSQL "select string_agg(case when schedule_id='$S1' then 'FECHA1' when schedule_id='$S2' then 'FECHA2' else 'otra' end,'+' order by schedule_id) from participant_schedules where participant_id='$VIC';")"
}

echo; echo "--- T1  ATAQUE: ya inscrito en FECHA1, se le inscribe a FECHA2 ---"
echo "ESTADO ANTES DE LA PETICION:"; estado_victima
echo "peticion: guestCount=1, guestLoads=0, las 2 cargas por id, y un invitado nuevo"
curl -s -X POST "$BASE/$SLUG/register" -H "Content-Type: application/json" -H "Origin: http://localhost:3100" \
  -d "{\"participantId\":\"$VIC\",\"scheduleIds\":[\"$S2\"],\"firstName\":\"Ya\",\"lastName\":\"Inscrito\",\"email\":\"ya.inscrito@example.com\",\"dietaryComments\":\"PISOTEADO POR EL ATACANTE\",\"guestCount\":1,\"guestLoads\":0,\"guests\":[{\"id\":\"$G1\"},{\"id\":\"$G2\"},{\"firstName\":\"Colado\",\"lastName\":\"Atacante\"}]}" \
  -w "\nHTTP=%{http_code}\n"
echo "ESTADO DESPUES DE LA PETICION:"; estado_victima

echo; echo "--- T2  CAMINO LEGITIMO: precargado NO inscrito completa datos + acompanante ---"
curl -s -X POST "$BASE/$SLUG/register" -H "Content-Type: application/json" -H "Origin: http://localhost:3100" \
  -d "{\"participantId\":\"$LEG\",\"scheduleIds\":[\"$S1\"],\"firstName\":\"No\",\"lastName\":\"Inscrito\",\"email\":\"no.inscrito@example.com\",\"phone\":\"+56911112222\",\"dietaryComments\":\"Alergia declarada por el propio asistente\",\"guests\":[{\"id\":\"$G3\"},{\"firstName\":\"Acom\",\"lastName\":\"Legitimo\"}]}" \
  -w "\nHTTP=%{http_code}\n"
echo "  participante : $($PSQL "select 'phone='||coalesce(phone,'-')||' dietary_comments='||coalesce(dietary_comments,'-') from participants where id='$LEG';")"
echo "  invitados    : $($PSQL "select string_agg(first_name||' '||last_name||' ['||registration_source||'] confirmed='||confirmed||' -> '||case when schedule_id='$S1' then 'FECHA1' else coalesce(schedule_id::text,'null') end,' | ' order by created_at) from guests where participant_id='$LEG';")"
echo "  fechas       : $($PSQL "select count(*) from participant_schedules where participant_id='$LEG';")"

echo; echo "==================== fin fase 2 · $ETI ===================="
