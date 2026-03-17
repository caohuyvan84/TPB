#!/bin/bash
set -e

KONG_ADMIN="http://localhost:8001"
SERVICE_URL="http://host.docker.internal:3007"

echo "Setting up Kong routes for Knowledge Service..."

# Create service
curl -s -X POST "$KONG_ADMIN/services/" \
  --data "name=knowledge-service" \
  --data "url=$SERVICE_URL" > /dev/null

# Create route
curl -s -X POST "$KONG_ADMIN/services/knowledge-service/routes" \
  --data "name=knowledge-routes" \
  --data "paths[]=/api/v1/kb" \
  --data "strip_path=false" > /dev/null

# Add rate limiting
curl -s -X POST "$KONG_ADMIN/services/knowledge-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" \
  --data "config.policy=local" > /dev/null

# Add CORS
curl -s -X POST "$KONG_ADMIN/services/knowledge-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PUT,PATCH,DELETE,OPTIONS" \
  --data "config.credentials=true" > /dev/null

echo "✅ Knowledge Service routes configured"
