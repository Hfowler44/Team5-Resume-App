#!/bin/sh
set -eu

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
  if [ -z "${CERTBOT_EMAIL:-}" ]; then
    echo "Certbot is installed but disabled. Set CERTBOT_EMAIL to request Let's Encrypt certificates."
    return
  fi

  if [ "${NGINX_SERVER_NAME}" = "localhost" ] || [ "${NGINX_SERVER_NAME}" = "_" ]; then
    echo "CERTBOT_EMAIL requires FRONTEND_DOMAIN or NGINX_SERVER_NAME to be a public domain."
    return
  fi

  (
    sleep 10

    if run_certbot_once; then
      use_live_certificate_if_available || true
      nginx -s reload || true
    fi

    while :; do
      sleep 43200

      if certbot renew --webroot -w "${CERTBOT_WEBROOT}" --quiet; then
        use_live_certificate_if_available || true
        nginx -s reload || true
      fi
    done
  ) &
}

ensure_fallback_certificate
start_certbot_worker
