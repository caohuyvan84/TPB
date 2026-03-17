#!/bin/bash
# Configure Kong for Agent Service

KONG_ADMIN="http://localhost:8001"
AGENT_URL="http://host.docker.internal:3002"

echo "🔧 Configuring Kong for Agent Service..."

# Create service
curl -s -X POST "$KONG_ADMIN/services/" \
  --data "name=agent-service" \
  --data "url=$AGENT_URL" > /dev/null

# Create routes
curl -s -X POST "$KONG_ADMIN/services/agent-service/routes" \
  --data "name=agent-routes" \
  --data "paths[]=/api/v1/agents" \
  --data "strip_path=false" > /dev/null

# Enable rate limiting
curl -s -X POST "$KONG_ADMIN/services/agent-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" > /dev/null

# Enable CORS
curl -s -X POST "$KONG_ADMIN/services/agent-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PUT,DELETE,OPTIONS" \
  --data "config.credentials=true" > /dev/null

echo "✅ Agent Service configured in Kong"
echo "   - GET  http://localhost:8000/api/v1/agents/me"
echo "   - GET  http://localhost:8000/api/v1/agents/me/status"
echo "   - PUT  http://localhost:8000/api/v1/agents/me/status/:channel"
echo "   - POST http://localhost:8000/api/v1/agents/me/heartbeat"
