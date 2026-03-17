#!/bin/bash
# Configure Kong for Interaction Service

KONG_ADMIN="http://localhost:8001"
INTERACTION_URL="http://host.docker.internal:3003"

echo "🔧 Configuring Kong for Interaction Service..."

curl -s -X POST "$KONG_ADMIN/services/" \
  --data "name=interaction-service" \
  --data "url=$INTERACTION_URL" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/interaction-service/routes" \
  --data "name=interaction-routes" \
  --data "paths[]=/api/v1/interactions" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/interaction-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/interaction-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PUT,DELETE,OPTIONS" \
  --data "config.credentials=true" > /dev/null

echo "✅ Interaction Service configured in Kong"
echo "   - GET  http://localhost:8000/api/v1/interactions"
echo "   - GET  http://localhost:8000/api/v1/interactions/:id"
echo "   - PUT  http://localhost:8000/api/v1/interactions/:id/status"
echo "   - PUT  http://localhost:8000/api/v1/interactions/:id/assign"
echo "   - GET  http://localhost:8000/api/v1/interactions/:id/notes"
echo "   - POST http://localhost:8000/api/v1/interactions/:id/notes"
