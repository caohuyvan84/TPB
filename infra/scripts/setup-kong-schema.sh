#!/bin/bash
set -e

KONG_ADMIN="http://localhost:8001"
SERVICE_NAME="object-schema-service"
SERVICE_URL="http://host.docker.internal:3013"

echo "Setting up Kong for Object Schema Service..."

curl -i -X POST $KONG_ADMIN/services/ \
  --data "name=$SERVICE_NAME" \
  --data "url=$SERVICE_URL"

curl -i -X POST $KONG_ADMIN/services/$SERVICE_NAME/routes \
  --data "paths[]=/api/v1/schemas" \
  --data "paths[]=/api/v1/admin/object-types" \
  --data "strip_path=false"

curl -i -X POST $KONG_ADMIN/services/$SERVICE_NAME/plugins \
  --data "name=rate-limiting" \
  --data "config.minute=100" \
  --data "config.policy=local"

curl -i -X POST $KONG_ADMIN/services/$SERVICE_NAME/plugins \
  --data "name=cors" \
  --data "config.origins=*" \
  --data "config.methods=GET" \
  --data "config.methods=POST" \
  --data "config.methods=PUT" \
  --data "config.methods=DELETE" \
  --data "config.methods=PATCH" \
  --data "config.headers=Accept,Content-Type,Authorization"

echo "✅ Object Schema Service configured in Kong"
