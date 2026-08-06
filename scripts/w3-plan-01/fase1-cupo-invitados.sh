#!/usr/bin/env bash
# Batería W3 de R1-01. Se ejecuta igual contra el código de ANTES y el de DESPUÉS.
# Uso: bash w3.sh <etiqueta> <stamp-fixtures> <slug-ui> <schedId-ui> <partId-ui>
set -u
BASE="http://localhost:3100/api/public/events"
ETI="$1"; STAMP="$2"; UISLUG="$3"; UISCH="$4"; UIPART="$5"

PSQL="docker exec acreditacion_pg_local psql -U postgres -d acreditacion -At -c"

echo "==================== $ETI ===================="

post() { # $1=slug $2=json
  curl -s -X POST "$BASE/$1/register" -H "Content-Type: application/json" \
    -H "Origin: http://localhost:3100" -d "$2" -w "\nHTTP=%{http_code}"
}

ids() { $PSQL "select json_build_object('ev',e.id,'sch',s.id,'p',p.id) from events e join event_schedules s on s.event_id=e.id left join participants p on p.event_id=e.id where e.public_slug='$1' limit 1;"; }

# ---------- T1: evento creado DESDE LA APP, modo rut, acompañante ----------
echo; echo "--- T1  evento creado desde la UI (cupo no tocado) + acompanante ---"
$PSQL "select 'cupo_guardado='||max_guests_per_participant||' allow_guests='||allow_guests from events where public_slug='$UISLUG';"
post "$UISLUG" "{\"participantId\":\"$UIPART\",\"scheduleIds\":[\"$UISCH\"],\"firstName\":\"Uiel\",\"lastName\":\"Precargado\",\"email\":\"uiel@example.com\",\"guests\":[{\"firstName\":\"Acom\",\"lastName\":\"Panante\"}]}"
echo "FILAS EN guests:"
$PSQL "select coalesce(string_agg(first_name||' '||coalesce(last_name,'')||' ['||registration_source||']',' | '),'(NINGUNA)') from guests where participant_id='$UIPART';"
$PSQL "select 'total='||count(*) from guests where participant_id='$UIPART';"

# ---------- T2: precargado con 2 CARGAS del organizador y cupo 2 ----------
echo; echo "--- T2  participante con 2 cargas precargadas, cupo 2, + acompanante ---"
CSLUG="r101-cargas-$STAMP"
CPART=$($PSQL "select p.id from participants p join events e on e.id=p.event_id where e.public_slug='$CSLUG';")
CSCH=$($PSQL "select s.id from event_schedules s join events e on e.id=s.event_id where e.public_slug='$CSLUG';")
G1=$($PSQL "select id from guests where participant_id='$CPART' order by created_at limit 1;")
G2=$($PSQL "select id from guests where participant_id='$CPART' order by created_at desc limit 1;")
echo "cargas precargadas: $($PSQL "select count(*) from guests where participant_id='$CPART';")"
post "$CSLUG" "{\"participantId\":\"$CPART\",\"scheduleIds\":[\"$CSCH\"],\"firstName\":\"Con\",\"lastName\":\"Cargas\",\"email\":\"con.cargas@example.com\",\"guests\":[{\"id\":\"$G1\"},{\"id\":\"$G2\"},{\"firstName\":\"Acom\",\"lastName\":\"Panante\"}]}"
echo "FILAS EN guests:"
$PSQL "select first_name||' '||coalesce(last_name,'')||' ['||registration_source||'] confirmed='||confirmed from guests where participant_id='$CPART' order by created_at;"
$PSQL "select 'total='||count(*)||' de_los_cuales_PUBLIC_FORM='||count(*) filter (where registration_source='PUBLIC_FORM') from guests where participant_id='$CPART';"

# ---------- T3: allowGuests = false ----------
echo; echo "--- T3  allowGuests=false + acompanante (NO debe crearse) ---"
NSLUG="r101-noguests-$STAMP"
NPART=$($PSQL "select p.id from participants p join events e on e.id=p.event_id where e.public_slug='$NSLUG';")
NSCH=$($PSQL "select s.id from event_schedules s join events e on e.id=s.event_id where e.public_slug='$NSLUG';")
post "$NSLUG" "{\"participantId\":\"$NPART\",\"scheduleIds\":[\"$NSCH\"],\"firstName\":\"Sin\",\"lastName\":\"Invitados\",\"email\":\"sin.invitados@example.com\",\"guests\":[{\"firstName\":\"NoDebe\",\"lastName\":\"Existir\"}]}"
echo "FILAS EN guests:"
$PSQL "select 'total='||count(*) from guests where participant_id='$NPART';"

# ---------- T4: 50 invitados en una peticion ----------
echo; echo "--- T4  50 invitados en una peticion (modo abierto) ---"
OSLUG="r101-open-$STAMP"
OSCH=$($PSQL "select s.id from event_schedules s join events e on e.id=s.event_id where e.public_slug='$OSLUG';")
G50=$(node -e 'process.stdout.write(JSON.stringify(Array.from({length:50},(_,i)=>({firstName:"G"+i,lastName:"Masivo"}))))')
RUT50="50000000-$ETI"
post "$OSLUG" "{\"scheduleIds\":[\"$OSCH\"],\"firstName\":\"Masivo\",\"lastName\":\"Cincuenta\",\"email\":\"masivo.$ETI@example.com\",\"documentNumber\":\"$RUT50\",\"guests\":$G50}"
echo "FILAS EN guests del participante masivo:"
$PSQL "select 'total='||count(*) from guests g join participants p on p.id=g.participant_id where p.document_number='$RUT50';"

# ---------- T5: modo abierto legitimo (2 invitados, cupo 2) ----------
echo; echo "--- T5  modo abierto legitimo: 2 invitados con cupo 2 ---"
RUTOK="60000000-$ETI"
post "$OSLUG" "{\"scheduleIds\":[\"$OSCH\"],\"firstName\":\"Abierto\",\"lastName\":\"Legitimo\",\"email\":\"abierto.$ETI@example.com\",\"documentNumber\":\"$RUTOK\",\"guests\":[{\"firstName\":\"Inv\",\"lastName\":\"Uno\"},{\"firstName\":\"Inv\",\"lastName\":\"Dos\"}]}"
echo "FILAS EN guests:"
$PSQL "select g.first_name||' '||g.last_name||' ['||g.registration_source||']' from guests g join participants p on p.id=g.participant_id where p.document_number='$RUTOK' order by g.created_at;"
$PSQL "select 'total='||count(*) from guests g join participants p on p.id=g.participant_id where p.document_number='$RUTOK';"

echo; echo "==================== fin $ETI ===================="
