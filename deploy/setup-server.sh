#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
readonly EXPECTED_PROJECT_ROOT="/home/slb/crmlab"
readonly ENV_TEMPLATE="${PROJECT_ROOT}/apps/api/.env.production.example"
readonly ENV_FILE="${PROJECT_ROOT}/apps/api/.env"
readonly NGINX_SOURCE="${PROJECT_ROOT}/deploy/nginx/crmlab.conf"
readonly NGINX_TARGET="/etc/nginx/sites-enabled/crmlab.conf"
readonly PM2_APP_NAME="crmlab-api"
readonly SECRET_KEYS=(
  JWT_ACCESS_SECRET
  JWT_REFRESH_SECRET
  CSRF_SECRET
  CREDENTIAL_ENCRYPTION_KEY
)

log() {
  printf '\n==> %s\n' "$1"
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is not installed: $1"
}

read_env_value() {
  local key="$1"
  local line

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == "${key}="* ]]; then
      printf '%s' "${line#*=}"
      return 0
    fi
  done < "$ENV_FILE"

  return 1
}

write_env_value() {
  local key="$1"
  local value="$2"
  local line
  local found=false
  local temporary_file

  temporary_file="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
  chmod 600 "$temporary_file"

  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == "${key}="* ]]; then
      printf '%s=%s\n' "$key" "$value" >> "$temporary_file"
      found=true
    else
      printf '%s\n' "$line" >> "$temporary_file"
    fi
  done < "$ENV_FILE"

  if [[ "$found" == false ]]; then
    printf '%s=%s\n' "$key" "$value" >> "$temporary_file"
  fi

  mv "$temporary_file" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
}

configure_secrets() {
  local key
  local current_value
  local generated_value

  for key in "${SECRET_KEYS[@]}"; do
    current_value="$(read_env_value "$key" || true)"

    if [[ -z "$current_value" || "$current_value" == *replace-with* || "$current_value" == *change-me* ]]; then
      generated_value="$(openssl rand -hex 32)"
      write_env_value "$key" "$generated_value"
      printf 'Generated %s\n' "$key"
      continue
    fi

    if (( ${#current_value} < 32 )); then
      fail "${key} already exists but is shorter than 32 characters; update it manually"
    fi

    printf 'Preserved existing %s\n' "$key"
  done
}

install_nginx_config() {
  if [[ -e "$NGINX_TARGET" && ! -L "$NGINX_TARGET" ]]; then
    fail "${NGINX_TARGET} exists and is not a symlink; move it manually before continuing"
  fi

  if [[ -L "$NGINX_TARGET" ]]; then
    sudo ln -sfn "$NGINX_SOURCE" "$NGINX_TARGET"
  else
    sudo ln -s "$NGINX_SOURCE" "$NGINX_TARGET"
  fi

  sudo nginx -t
  sudo systemctl reload nginx
}

verify_backend() {
  if curl --fail --silent --show-error --retry 10 --retry-delay 2 \
    http://127.0.0.1:4000/api/health >/dev/null; then
    printf 'Backend health check passed on 127.0.0.1:4000\n'
    return 0
  fi

  printf '\nBackend did not start successfully. Recent PM2 logs:\n' >&2
  pm2 logs "$PM2_APP_NAME" --lines 100 --nostream >&2 || true
  fail "Backend health check failed; fix the PM2 error before configuring Nginx"
}

main() {
  if [[ "$EUID" -eq 0 ]]; then
    fail "Run this script as the deployment user, not root; it invokes sudo only where required"
  fi

  [[ "$PROJECT_ROOT" == "$EXPECTED_PROJECT_ROOT" ]] ||
    fail "Clone or move the project to ${EXPECTED_PROJECT_ROOT}; Nginx is configured to serve that path"

  require_command npm
  require_command node
  require_command openssl
  require_command pm2
  require_command curl
  require_command sudo
  require_command nginx
  require_command systemctl

  [[ -f "$ENV_TEMPLATE" ]] || fail "Missing environment template: ${ENV_TEMPLATE}"
  [[ -f "$NGINX_SOURCE" ]] || fail "Missing Nginx configuration: ${NGINX_SOURCE}"

  cd "$PROJECT_ROOT"

  log "Installing Node.js dependencies"
  npm ci

  log "Preparing the backend production environment"
  if [[ ! -f "$ENV_FILE" ]]; then
    cp "$ENV_TEMPLATE" "$ENV_FILE"
    printf 'Created %s\n' "$ENV_FILE"
  else
    printf 'Using existing %s\n' "$ENV_FILE"
  fi
  chmod 600 "$ENV_FILE"
  configure_secrets

  log "Preparing persistent uploads"
  sudo mkdir -p /var/lib/crmlab/uploads
  sudo chown "$(id -u):$(id -g)" /var/lib/crmlab/uploads

  log "Building frontend and backend"
  npm run build

  log "Granting Nginx read access to the built frontend"
  sudo chmod o+x /home/slb "$PROJECT_ROOT"
  chmod -R o+rX "${PROJECT_ROOT}/dist/web-fsa"

  log "Starting the backend with PM2"
  if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    pm2 reload ecosystem.config.cjs --env production --update-env
  else
    pm2 start ecosystem.config.cjs --env production
  fi
  pm2 save

  log "Checking the backend before enabling Nginx"
  verify_backend

  log "Installing and validating Nginx configuration"
  install_nginx_config

  log "Verifying the deployment"
  curl --fail --silent --show-error --retry 10 --retry-delay 2 \
    http://10.10.10.122/api/health >/dev/null

  printf '\nDeployment completed successfully.\n'
  printf 'Frontend: http://10.10.10.122\n'
  printf 'API:      http://10.10.10.122/api\n'
}

main "$@"
