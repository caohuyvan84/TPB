#!/bin/bash
set -e

KONG_ADMIN="http://localhost:8001"
SERVICE_URL="http://host.docker.internal:3009"

echo "Setting up Kong routes for AI Service..."

curl -s -X POST "$KONG_ADMIN/services/" \
  --data "name=ai-service" \
  --data "url=$SERVICE_URL" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/ai-service/routes" \
  --data "name=ai-routes" \
  --data "paths[]=/api/v1/ai" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/ai-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" \
  --data "config.policy=local" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/ai-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PUT,PATCH,DELETE,OPTIONS" \
  --data "config.credentials=true" > /dev/null

echo "✅ AI Service routes configured"
