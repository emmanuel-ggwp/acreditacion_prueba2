#!/usr/bin/env bash
# Batería W3 de R1-04 (fase 4). Igual contra ANTES y DESPUÉS.
# Uso: bash w3-fase4.sh <etiqueta> <slugRut> <schRut> <partRut> <slugOpen> <schOpen>
set -u
BASE="http://localhost:3100/api/public/events"
ETI="$1"; SLUG="$2"; SCH="$3"; PART="$4"; OSLUG="$5"; OSCH="$6"

echo "==================== FASE 4 · $ETI ===================="

req() { # $1=slug $2=json $3=titulo
  printf '%-52s ' "$3"
  curl -s -o /tmp/r104.out -w "HTTP=%{http_code}" -X POST "$BASE/$1/register" \
    -H "Content-Type: application/json" -H "Origin: http://localhost:3100" -d "$2"
  echo "   $(head -c 150 /tmp/r104.out)"
}

echo; echo "--- scheduleIds mal formado: lo que producia el 500 ---"
req "$SLUG" "{\"participantId\":\"$PART\",\"scheduleIds\":[\"x\"],\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@example.com\"}" 'scheduleIds:["x"]  (no es UUID)'
req "$SLUG" "{\"participantId\":\"$PART\",\"scheduleIds\":[],\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@example.com\"}" 'scheduleIds:[]     (vacio)'
req "$SLUG" "{\"participantId\":\"$PART\",\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@example.com\"}" 'scheduleIds ausente'
req "$SLUG" "{\"participantId\":\"$PART\",\"scheduleIds\":\"no-soy-array\",\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@example.com\"}" 'scheduleIds no-array (string)'
req "$SLUG" "{\"participantId\":\"$PART\",\"scheduleIds\":[123],\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@example.com\"}" 'scheduleIds:[123]  (numero)'
req "$SLUG" "{\"participantId\":\"no-uuid\",\"scheduleIds\":[\"$SCH\"],\"firstName\":\"A\",\"lastName\":\"B\",\"email\":\"a@example.com\"}" 'participantId no-UUID'

echo; echo "--- lo mismo en MODO ABIERTO ---"
req "$OSLUG" "{\"scheduleIds\":[\"x\"],\"firstName\":\"Abierto\",\"lastName\":\"Malo\",\"email\":\"ab@example.com\",\"documentNumber\":\"99999999-9\"}" 'scheduleIds:["x"]  (modo abierto)'

echo; echo "--- el registro legitimo sigue funcionando en los DOS modos ---"
req "$SLUG" "{\"participantId\":\"$PART\",\"scheduleIds\":[\"$SCH\"],\"firstName\":\"Legit\",\"lastName\":\"Rut\",\"email\":\"legit.rut@example.com\"}" 'modo rut  legitimo'
RUTOK="80000000-$ETI"
req "$OSLUG" "{\"scheduleIds\":[\"$OSCH\"],\"firstName\":\"Legit\",\"lastName\":\"Abierto\",\"email\":\"legit.abierto.$ETI@example.com\",\"documentNumber\":\"$RUTOK\"}" 'modo abierto legitimo'

echo; echo "==================== fin fase 4 · $ETI ===================="
