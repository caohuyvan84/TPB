#!/bin/bash
set -e

KONG_ADMIN="http://localhost:8001"
SERVICE_NAME="media-service"
SERVICE_URL="http://host.docker.internal:3010"

echo "Setting up Kong for Media Service..."

# Create service
curl -i -X POST $KONG_ADMIN/services/ \
  --data "name=$SERVICE_NAME" \
  --data "url=$SERVICE_URL"

# Create route
curl -i -X POST $KONG_ADMIN/services/$SERVICE_NAME/routes \
  --data "paths[]=/api/v1/media" \
  --data "strip_path=false"

# Add rate limiting
curl -i -X POST $KONG_ADMIN/services/$SERVICE_NAME/plugins \
  --data "name=rate-limiting" \
  --data "config.minute=100" \
  --data "config.policy=local"

# Add CORS
curl -i -X POST $KONG_ADMIN/services/$SERVICE_NAME/plugins \
  --data "name=cors" \
  --data "config.origins=*" \
  --data "config.methods=GET" \
  --data "config.methods=POST" \
  --data "config.methods=PUT" \
  --data "config.methods=DELETE" \
  --data "config.methods=PATCH" \
  --data "config.headers=Accept,Content-Type,Authorization"

echo "✅ Media Service configured in Kong"
