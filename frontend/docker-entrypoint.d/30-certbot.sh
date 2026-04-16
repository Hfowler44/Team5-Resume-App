#!/bin/sh
set -eu

is_true() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]')" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

CERT_DIR="/etc/nginx/certs"
LIVE_CERT_DIR="/etc/letsencrypt/live/${NGINX_SERVER_NAME}"
LIVE_FULLCHAIN="${LIVE_CERT_DIR}/fullchain.pem"
LIVE_PRIVKEY="${LIVE_CERT_DIR}/privkey.pem"
NGINX_FULLCHAIN="${CERT_DIR}/fullchain.pem"
NGINX_PRIVKEY="${CERT_DIR}/privkey.pem"

mkdir -p \
  "${CERTBOT_WEBROOT}" \
  "${CERT_DIR}" \
  /etc/letsencrypt \
  /var/lib/letsencrypt \
  /var/log/letsencrypt

use_live_certificate_if_available() {
  if [ -s "${LIVE_FULLCHAIN}" ] && [ -s "${LIVE_PRIVKEY}" ]; then
    ln -sf "${LIVE_FULLCHAIN}" "${NGINX_FULLCHAIN}"
    ln -sf "${LIVE_PRIVKEY}" "${NGINX_PRIVKEY}"
    return 0
  fi

  return 1
}

ensure_fallback_certificate() {
  if use_live_certificate_if_available; then
    return
  fi

  if [ -s "${NGINX_FULLCHAIN}" ] && [ -s "${NGINX_PRIVKEY}" ]; then
    return
  fi

  rm -f "${NGINX_FULLCHAIN}" "${NGINX_PRIVKEY}"
  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -days 1 \
    -subj "/CN=${NGINX_SERVER_NAME}" \
    -keyout "${NGINX_PRIVKEY}" \
    -out "${NGINX_FULLCHAIN}" >/dev/null 2>&1
}

run_certbot_once() {
  if is_true "${CERTBOT_STAGING}"; then
    certbot certonly \
      --staging \
      --webroot \
      -w "${CERTBOT_WEBROOT}" \
      -d "${NGINX_SERVER_NAME}" \
      --email "${CERTBOT_EMAIL}" \
      --agree-tos \
      --non-interactive \
      --keep-until-expiring
    return
  fi

  certbot certonly \
    --webroot \
    -w "${CERTBOT_WEBROOT}" \
    -d "${NGINX_SERVER_NAME}" \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos \
    --non-interactive \
    --keep-until-expiring
}

start_certbot_worker() {
  if ! is_true "${CERTBOT_ENABLE}"; then
    echo "Certbot is installed but disabled. Set CERTBOT_ENABLE=true to request Let's Encrypt certificates."
    return
  fi

  if [ -z "${CERTBOT_EMAIL:-}" ]; then
    echo "CERTBOT_ENABLE=true requires CERTBOT_EMAIL. Keeping fallback HTTPS certificate."
    return
  fi

  if [ "${NGINX_SERVER_NAME}" = "localhost" ] || [ "${NGINX_SERVER_NAME}" = "_" ]; then
    echo "CERTBOT_ENABLE=true requires FRONTEND_DOMAIN or NGINX_SERVER_NAME to be a public domain."
    return
  fi

  (
    sleep "${CERTBOT_STARTUP_DELAY_SECONDS}"

    if run_certbot_once; then
      use_live_certificate_if_available || true
      nginx -s reload || true
    fi

    while :; do
      sleep "${CERTBOT_RENEW_INTERVAL_SECONDS}"

      if certbot renew --webroot -w "${CERTBOT_WEBROOT}" --quiet; then
        use_live_certificate_if_available || true
        nginx -s reload || true
      fi
    done
  ) &
}

ensure_fallback_certificate
start_certbot_worker
