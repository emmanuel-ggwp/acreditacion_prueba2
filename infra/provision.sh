#!/usr/bin/env bash
# =============================================================================
# infra/provision.sh — aprovisionamiento IDEMPOTENTE del droplet (plan 07, fase 3)
#
# Deja el droplet listo para recibir el despliegue (fase 4). Ejecutarlo dos
# veces no rompe nada: cada paso comprueba el estado antes de tocar, los
# ficheros solo se reinstalan si difieren de los del repositorio y el fichero
# de entorno NUNCA se regenera si ya existe (contiene secretos).
#
# Todo lo que instala vive versionado en infra/ (F6-01): un cambio no
# autorizado en el servidor es un `git diff` contra este árbol.
#
# USO (como root, desde el clon del repositorio):
#
#   DOMAIN=ejemplo.cl CERTBOT_EMAIL=alguien@ejemplo.cl bash infra/provision.sh
#
# Parámetros por entorno (los demás tienen valor por defecto razonable):
#   DOMAIN             (OBLIGATORIO) dominio público del sitio
#   CERTBOT_EMAIL      correo para Let's Encrypt; sin él no se emite certificado
#   APP_PORT           puerto local de next start (3000)
#   SERVICE_USER       usuario de servicio sin privilegios (tuacreditacion)
#   ADMIN_USER         usuario administrador con sudo (operador)
#   APP_ROOT           raíz de despliegue (/srv/tuacreditacion)
#   UPLOADS_DIR        subidas persistentes (/var/lib/tuacreditacion/uploads)
#   MAX_BODY           client_max_body_size de Nginx (9m) [P07-D7.11]
#   NODE_MAJOR         major de Node (24, P07-D7.5)
#   ADMIN_DATABASE_URL URL de doadmin para el paso SQL (opcional; R2: jamás se
#                      imprime). Requiere APP_DB_USER y APP_DB_NAME.
#
# Solo para VALIDAR el script en contenedores sin DNS público (verificación de
# la fase 3) — en un droplet real NO se usan:
#   TEST_SKIP_CERTBOT=1  no emite certificado
#   TEST_SKIP_UFW=1      no toca el firewall
#
# Lo que este script NO puede hacer (queda en el resumen final y en el runbook):
#   - añadir el droplet a las trusted sources del cluster (consola; y un
#     droplet reconstruido tiene ID NUEVO: hay que re-añadirlo SIEMPRE),
#   - descargar la CA del cluster (consola/API) a /etc/tuacreditacion/,
#   - crear el usuario de aplicación de la base (consola).
# =============================================================================
set -euo pipefail

DOMAIN="${DOMAIN:-}"
APP_PORT="${APP_PORT:-3000}"
SERVICE_USER="${SERVICE_USER:-tuacreditacion}"
ADMIN_USER="${ADMIN_USER:-operador}"
APP_ROOT="${APP_ROOT:-/srv/tuacreditacion}"
UPLOADS_DIR="${UPLOADS_DIR:-/var/lib/tuacreditacion/uploads}"
ENV_FILE="${ENV_FILE:-/etc/tuacreditacion.env}"
CONF_DIR="/etc/tuacreditacion"
MAX_BODY="${MAX_BODY:-9m}"
NODE_MAJOR="${NODE_MAJOR:-24}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"
ACME_WEBROOT="/var/www/letsencrypt"
APP_DB_USER="${APP_DB_USER:-}"
APP_DB_NAME="${APP_DB_NAME:-}"
TEST_SKIP_CERTBOT="${TEST_SKIP_CERTBOT:-0}"
TEST_SKIP_UFW="${TEST_SKIP_UFW:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_AVAILABLE="/etc/nginx/sites-available"
SITE_ENABLED="/etc/nginx/sites-enabled"
PENDIENTES=()
NGINX_DIRTY=0
LAST_CHANGED=0

log()  { printf '\n== %s\n' "$*"; }
info() { printf '   %s\n' "$*"; }
pend() { PENDIENTES+=("$*"); }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

systemd_running() { [ -d /run/systemd/system ]; }

# Instala <origen> en <destino> solo si difieren. Deja LAST_CHANGED en 1/0.
install_if_changed() {
  local src="$1" dst="$2" mode="${3:-644}"
  LAST_CHANGED=0
  if [ -f "$dst" ] && cmp -s "$src" "$dst"; then
    info "sin cambios: $dst"
    return 0
  fi
  install -m "$mode" "$src" "$dst"
  info "instalado: $dst"
  LAST_CHANGED=1
}

# Renderiza una plantilla del repositorio (tokens @...@) y la instala si cambió.
render() {
  local src="$1" dst="$2" mode="${3:-644}" tmp
  tmp="$(mktemp)"
  sed -e "s|@DOMAIN@|${DOMAIN}|g" \
      -e "s|@APP_PORT@|${APP_PORT}|g" \
      -e "s|@UPLOADS_DIR@|${UPLOADS_DIR}|g" \
      -e "s|@MAX_BODY@|${MAX_BODY}|g" \
      "$src" > "$tmp"
  install_if_changed "$tmp" "$dst" "$mode"
  rm -f "$tmp"
}

paso_paquetes() {
  log "Paquetes base"
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y -qq
  apt-get install -y -qq --no-install-recommends \
    ca-certificates curl gnupg git openssl \
    nginx ufw unattended-upgrades openssh-server \
    postgresql-client certbot
}

paso_node() {
  log "Node ${NODE_MAJOR} (P07-D7.5)"
  if command -v node >/dev/null 2>&1; then
    local actual
    actual="$(node -v | sed 's/^v//' | cut -d. -f1)"
    if [ "$actual" = "$NODE_MAJOR" ]; then
      info "ya instalado: $(node -v)"
      return 0
    fi
    info "Node v${actual} instalado; se sustituye por ${NODE_MAJOR}.x (NodeSource)"
  fi
  # Repositorio NodeSource con clave verificable en keyring propio. NUNCA
  # `curl | bash`: en la reconstrucción posterior a un compromiso no se
  # ejecuta código remoto sin verificar como root.
  install -d -m 755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  printf 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_%s.x nodistro main\n' \
    "$NODE_MAJOR" > /etc/apt/sources.list.d/nodesource.list
  apt-get update -y -qq
  apt-get install -y -qq nodejs
  info "instalado: $(node -v)"
}

paso_usuarios() {
  log "Usuarios"
  # Usuario de SERVICIO: de sistema, sin shell de login, sin contraseña. La
  # aplicación corre como él (unidad systemd); no es un usuario de entrada.
  if id -u "$SERVICE_USER" >/dev/null 2>&1; then
    info "usuario de servicio ya existe: $SERVICE_USER"
  else
    useradd --system --user-group --shell /usr/sbin/nologin \
      --home-dir /var/lib/tuacreditacion --no-create-home "$SERVICE_USER"
    info "creado usuario de servicio: $SERVICE_USER (nologin)"
  fi

  # Usuario ADMINISTRADOR con sudo: la puerta de entrada una vez que sshd
  # cierre el login de root. Hereda la clave pública de root si aún no tiene.
  if id -u "$ADMIN_USER" >/dev/null 2>&1; then
    info "usuario administrador ya existe: $ADMIN_USER"
  else
    useradd --create-home --shell /bin/bash "$ADMIN_USER"
    usermod -aG sudo "$ADMIN_USER"
    info "creado usuario administrador: $ADMIN_USER (sudo)"
  fi
  if [ ! -s "/home/$ADMIN_USER/.ssh/authorized_keys" ] && [ -s /root/.ssh/authorized_keys ]; then
    install -d -m 700 -o "$ADMIN_USER" -g "$ADMIN_USER" "/home/$ADMIN_USER/.ssh"
    install -m 600 -o "$ADMIN_USER" -g "$ADMIN_USER" \
      /root/.ssh/authorized_keys "/home/$ADMIN_USER/.ssh/authorized_keys"
    info "clave de root copiada a $ADMIN_USER"
  fi
}

paso_directorios() {
  log "Directorios"
  # Árbol de despliegue: propiedad del administrador (la fase 4 despliega sin
  # root); el servicio solo necesita LEERLO.
  install -d -m 755 -o "$ADMIN_USER" -g "$ADMIN_USER" "$APP_ROOT" "$APP_ROOT/app"
  # Configuración no secreta (la CA del cluster es un certificado público).
  install -d -m 755 "$CONF_DIR"
  # Subidas persistentes FUERA del árbol de despliegue: sobreviven al
  # redespliegue. Grupo www-data con rx: Nginx las sirve por alias; los
  # ficheros nacen 644 (umask 0022 de la unidad).
  install -d -m 750 -o "$SERVICE_USER" -g www-data "$UPLOADS_DIR"
  # Webroot del reto ACME.
  install -d -m 755 "$ACME_WEBROOT"
}

paso_env_file() {
  log "Fichero de entorno ($ENV_FILE)"
  if [ -f "$ENV_FILE" ]; then
    # NUNCA se regenera: contiene secretos ya en uso. Idempotencia = no tocar.
    info "ya existe: se conserva tal cual (no se regeneran secretos)"
  else
    # Secretos nuevos de 64 hex (32 bytes): nada del servidor anterior se
    # reutiliza. R2: no se imprimen, no quedan en logs ni en el historial.
    local tmp jwt1 jwt2
    jwt1="$(openssl rand -hex 32)"
    jwt2="$(openssl rand -hex 32)"
    tmp="$(mktemp)"
    sed -e "s|@DOMAIN@|${DOMAIN}|g" \
        -e "s|@APP_PORT@|${APP_PORT}|g" \
        -e "s|@UPLOADS_DIR@|${UPLOADS_DIR}|g" \
        -e "s|@JWT_SECRET@|${jwt1}|g" \
        -e "s|@JWT_REFRESH_SECRET@|${jwt2}|g" \
        "$SCRIPT_DIR/env/tuacreditacion.env.template" > "$tmp"
    install -m 600 -o "$SERVICE_USER" -g "$SERVICE_USER" "$tmp" "$ENV_FILE"
    rm -f "$tmp"
    info "creado con secretos JWT nuevos (600, $SERVICE_USER)"
    pend "completar DATABASE_URL en $ENV_FILE (usuario de aplicación, hostname privado, SIN ?sslmode=...)"
    pend "completar las NEXT_PUBLIC_* de EmailJS en $ENV_FILE antes del build (fase 4)"
  fi
  if [ ! -s "$CONF_DIR/ca-certificate.crt" ]; then
    pend "descargar la CA del cluster a $CONF_DIR/ca-certificate.crt (consola: Connection Details -> Download CA certificate) y apuntar su caducidad: openssl x509 -in $CONF_DIR/ca-certificate.crt -noout -enddate (runbook I7)"
  else
    info "CA presente; caducidad: $(openssl x509 -in "$CONF_DIR/ca-certificate.crt" -noout -enddate)"
  fi
}

paso_ssh() {
  log "SSH: solo clave, sin root"
  # GUARDA ANTI-CIERRE: solo se endurece si alguien puede entrar con clave.
  local tiene_clave=0 f
  for f in /root/.ssh/authorized_keys /home/*/.ssh/authorized_keys; do
    if [ -s "$f" ]; then tiene_clave=1; fi
  done
  if [ "$tiene_clave" -eq 0 ]; then
    info "AVISO: ningún authorized_keys con contenido — NO se endurece sshd todavía"
    pend "añadir una clave SSH (root o $ADMIN_USER) y re-ejecutar provision.sh para endurecer sshd"
    return 0
  fi
  install -d -m 755 /etc/ssh/sshd_config.d
  install_if_changed "$SCRIPT_DIR/ssh/99-hardening.conf" /etc/ssh/sshd_config.d/99-hardening.conf
  if [ "$LAST_CHANGED" -eq 1 ]; then
    # sshd -t exige el directorio de separación de privilegios; normalmente lo
    # crea el arranque del servicio, pero aún no ha corrido tras una
    # instalación fresca.
    install -d -m 755 /run/sshd
    if ! /usr/sbin/sshd -t; then
      rm -f /etc/ssh/sshd_config.d/99-hardening.conf
      die "sshd -t rechazó la configuración endurecida; retirada para no perder el acceso"
    fi
    if systemd_running; then
      systemctl reload ssh || systemctl reload sshd || true
      info "sshd recargado (las sesiones abiertas no se cortan)"
    fi
  fi
}

paso_unattended() {
  log "Actualizaciones de seguridad automáticas"
  install_if_changed "$SCRIPT_DIR/apt/20auto-upgrades" /etc/apt/apt.conf.d/20auto-upgrades
}

paso_ufw() {
  log "Firewall: solo 22, 80, 443"
  if [ "$TEST_SKIP_UFW" = "1" ]; then
    info "SALTADO (TEST_SKIP_UFW=1 — solo válido para validar en contenedor)"
    pend "TEST_SKIP_UFW estaba activo: el firewall NO se configuró"
    return 0
  fi
  ufw default deny incoming >/dev/null
  ufw default allow outgoing >/dev/null
  ufw allow 22/tcp >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  # PostgreSQL nunca expuesto: no hay regla que abrir — la base es administrada
  # y el acceso lo restringen sus trusted sources, no este firewall.
  ufw --force enable >/dev/null
  info "$(ufw status verbose | head -3 | tr '\n' ' ')"
}

paso_nginx() {
  log "Nginx"
  # default_server que RECHAZA hosts desconocidos.
  install_if_changed "$SCRIPT_DIR/nginx/default-server.conf" "$SITE_AVAILABLE/00-default-server.conf"
  if [ "$LAST_CHANGED" -eq 1 ]; then NGINX_DIRTY=1; fi
  ln -sf "$SITE_AVAILABLE/00-default-server.conf" "$SITE_ENABLED/00-default-server.conf"
  # El sitio de fábrica de Ubuntu ("Welcome to nginx") respondería a cualquier
  # host: fuera.
  if [ -e "$SITE_ENABLED/default" ]; then
    rm -f "$SITE_ENABLED/default"
    NGINX_DIRTY=1
    info "retirado el sitio por defecto de la distribución"
  fi

  # Sitio real: la configuración definitiva referencia el certificado, así que
  # hasta que certbot lo emita se instala la de arranque (HTTP + reto ACME).
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    render "$SCRIPT_DIR/nginx/tuacreditacion.conf.template" "$SITE_AVAILABLE/tuacreditacion.conf"
  else
    render "$SCRIPT_DIR/nginx/tuacreditacion-bootstrap.conf.template" "$SITE_AVAILABLE/tuacreditacion.conf"
    info "sin certificado todavía: instalada la configuración de arranque (solo HTTP/ACME)"
  fi
  if [ "$LAST_CHANGED" -eq 1 ]; then NGINX_DIRTY=1; fi
  ln -sf "$SITE_AVAILABLE/tuacreditacion.conf" "$SITE_ENABLED/tuacreditacion.conf"

  nginx -t
  if systemd_running && [ "$NGINX_DIRTY" -eq 1 ]; then
    systemctl reload-or-restart nginx
    info "nginx recargado"
  fi
}

paso_certbot() {
  log "TLS (Let's Encrypt, renovación automática)"
  # Hook de despliegue: tras cada renovación (certbot.timer, lo trae el
  # paquete), Nginx recarga y sirve el certificado nuevo.
  local hook=/etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
  install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
  printf '#!/bin/sh\n# Instalado por infra/provision.sh: recargar Nginx tras renovar.\nsystemctl reload nginx\n' > "$hook.tmp"
  install_if_changed "$hook.tmp" "$hook" 755
  rm -f "$hook.tmp"

  if [ "$TEST_SKIP_CERTBOT" = "1" ]; then
    info "SALTADO (TEST_SKIP_CERTBOT=1 — solo válido para validar en contenedor)"
    pend "TEST_SKIP_CERTBOT estaba activo: certificado TLS NO emitido"
    return 0
  fi
  if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    info "certificado ya presente; renueva certbot.timer"
    return 0
  fi
  if [ -z "$CERTBOT_EMAIL" ]; then
    info "sin CERTBOT_EMAIL: no se emite certificado en esta pasada"
    pend "emitir el certificado: CERTBOT_EMAIL=... re-ejecutar provision.sh (requiere el DNS de $DOMAIN apuntando al droplet)"
    return 0
  fi
  if systemd_running; then
    systemctl start nginx
  fi
  certbot certonly --webroot -w "$ACME_WEBROOT" -d "$DOMAIN" \
    --non-interactive --agree-tos --keep-until-expiring -m "$CERTBOT_EMAIL"
  # Con el certificado ya en disco, entra la configuración definitiva.
  render "$SCRIPT_DIR/nginx/tuacreditacion.conf.template" "$SITE_AVAILABLE/tuacreditacion.conf"
  nginx -t
  if systemd_running; then
    systemctl reload-or-restart nginx
  fi
  info "certificado emitido e instalada la configuración TLS definitiva"
}

paso_systemd() {
  log "Unidad systemd (P07-D7.1: systemd, un solo proceso)"
  install_if_changed "$SCRIPT_DIR/systemd/tuacreditacion.service" /etc/systemd/system/tuacreditacion.service
  if systemd_running; then
    systemctl daemon-reload
    systemctl enable tuacreditacion.service
    info "unidad habilitada (NO arrancada: el código lo despliega la fase 4)"
  else
    info "systemd no está corriendo (¿contenedor?): unidad instalada, se habilita en el droplet real"
  fi
}

paso_db() {
  log "Base administrada: tabla rate_limits + permisos DML del usuario de aplicación"
  if [ -z "${ADMIN_DATABASE_URL:-}" ] || [ -z "$APP_DB_USER" ] || [ -z "$APP_DB_NAME" ]; then
    info "sin ADMIN_DATABASE_URL/APP_DB_USER/APP_DB_NAME: paso pospuesto"
    pend "ejecutar infra/sql/provision-db.sql como doadmin (ver cabecera del propio .sql); antes: crear el usuario de aplicación en la consola y añadir a trusted sources la máquina desde la que se ejecute"
    return 0
  fi
  # R2: ADMIN_DATABASE_URL lleva credenciales — no se imprime ni con set -x.
  psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 \
    -v app_user="$APP_DB_USER" -v db_name="$APP_DB_NAME" \
    -f "$SCRIPT_DIR/sql/provision-db.sql"
  info "rate_limits garantizada y permisos DML concedidos a $APP_DB_USER"
}

resumen() {
  log "Resumen"
  info "aprovisionamiento idempotente completado."
  # Lo que este script no puede hacer por diseño:
  pend "TRUSTED SOURCES: añadir ESTE droplet (como recurso, no por IP) al cluster — un droplet reconstruido tiene ID NUEVO y hay que re-añadirlo SIEMPRE (runbook)"
  if [ "${#PENDIENTES[@]}" -gt 0 ]; then
    printf '\nPENDIENTE (manual, ver infra/RUNBOOK.md):\n'
    local p
    for p in "${PENDIENTES[@]}"; do
      printf ' - %s\n' "$p"
    done
  fi
}

main() {
  [ "$(id -u)" -eq 0 ] || die "debe ejecutarse como root"
  [ -n "$DOMAIN" ] || die "falta DOMAIN (p. ej. DOMAIN=ejemplo.cl bash infra/provision.sh)"

  paso_paquetes
  paso_node
  paso_usuarios
  paso_directorios
  paso_env_file
  paso_ssh
  paso_unattended
  paso_ufw
  paso_nginx
  paso_certbot
  paso_systemd
  paso_db
  resumen
}

main "$@"
