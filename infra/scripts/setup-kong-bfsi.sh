#!/bin/bash
set -e

KONG_ADMIN="http://localhost:8001"
SERVICE_URL="http://host.docker.internal:3008"

echo "Setting up Kong routes for BFSI Core Service..."

# Create service
curl -s -X POST "$KONG_ADMIN/services/" \
  --data "name=bfsi-core-service" \
  --data "url=$SERVICE_URL" > /dev/null

# Create route
curl -s -X POST "$KONG_ADMIN/services/bfsi-core-service/routes" \
  --data "name=bfsi-routes" \
  --data "paths[]=/api/v1/bfsi" \
  --data "strip_path=false" > /dev/null

# Add rate limiting
curl -s -X POST "$KONG_ADMIN/services/bfsi-core-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" \
  --data "config.policy=local" > /dev/null

# Add CORS
curl -s -X POST "$KONG_ADMIN/services/bfsi-core-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PUT,PATCH,DELETE,OPTIONS" \
  --data "config.credentials=true" > /dev/null

echo "✅ BFSI Core Service routes configured"
