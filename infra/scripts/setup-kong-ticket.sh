#!/bin/bash
# Configure Kong for Ticket Service

KONG_ADMIN="http://localhost:8001"
TICKET_URL="http://host.docker.internal:3004"

echo "🔧 Configuring Kong for Ticket Service..."

curl -s -X POST "$KONG_ADMIN/services/" \
  --data "name=ticket-service" \
  --data "url=$TICKET_URL" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/ticket-service/routes" \
  --data "name=ticket-routes" \
  --data "paths[]=/api/v1/tickets" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/ticket-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/ticket-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PUT,PATCH,DELETE,OPTIONS" \
  --data "config.credentials=true" > /dev/null

echo "✅ Ticket Service configured in Kong"
echo "   - GET    http://localhost:8000/api/v1/tickets"
echo "   - POST   http://localhost:8000/api/v1/tickets"
echo "   - GET    http://localhost:8000/api/v1/tickets/:id"
echo "   - PATCH  http://localhost:8000/api/v1/tickets/:id"
echo "   - GET    http://localhost:8000/api/v1/tickets/:id/comments"
echo "   - POST   http://localhost:8000/api/v1/tickets/:id/comments"
echo "   - GET    http://localhost:8000/api/v1/tickets/:id/history"
