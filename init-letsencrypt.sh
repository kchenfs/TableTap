#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Ensure we have a domain name and email
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <domain> <email>"
  exit 1
fi

DOMAIN=$1
EMAIL=$2
DATA_PATH="./certbot"
# The --staging flag has been removed to get a production certificate
STAGING_ARG=""

# Check if certificate already exists and clear any leftover dummy certs
if [ -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
  echo "### Certificate for $DOMAIN already exists. Checking if it's a dummy... ###"
  if [ -f "$DATA_PATH/conf/live/$DOMAIN/privkey.pem" ] && grep -q "CN=localhost" <(openssl x509 -in "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" -text); then
      echo "### Found dummy certificate. Deleting it to proceed. ###"
      rm -Rf "$DATA_PATH/conf/live/$DOMAIN"
      rm -Rf "$DATA_PATH/conf/archive/$DOMAIN"
      rm -Rf "$DATA_PATH/conf/renewal/$DOMAIN.conf"
  else
      echo "### Real certificate found. Skipping creation. ###"
      exit 0
  fi
fi

echo "### Creating dummy certificate for $DOMAIN ... ###"
path="/etc/letsencrypt/live/$DOMAIN"
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"
docker-compose run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:4096 -days 1\
    -keyout '$path/privkey.pem' \
    -out '$path/fullchain.pem' \
    -subj '/CN=localhost'" certbot

echo "### Starting all services ... ###"
docker-compose up -d

echo "### Deleting dummy certificate for $DOMAIN ... ###"
docker-compose run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/$DOMAIN && \
  rm -Rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -Rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

echo "### Requesting Let's Encrypt certificate for $DOMAIN ... ###"
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $EMAIL \
    -d $DOMAIN \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal \
    --non-interactive" certbot

echo "### Reloading nginx ... ###"
docker-compose exec nginx-proxy nginx -s reload

echo "### PRODUCTION SETUP COMPLETE! ###"