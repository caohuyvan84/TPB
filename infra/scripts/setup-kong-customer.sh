#!/bin/bash
# Configure Kong for Customer Service

KONG_ADMIN="http://localhost:8001"
CUSTOMER_URL="http://host.docker.internal:3005"

echo "🔧 Configuring Kong for Customer Service..."

curl -s -X POST "$KONG_ADMIN/services/" \
  --data "name=customer-service" \
  --data "url=$CUSTOMER_URL" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/customer-service/routes" \
  --data "name=customer-routes" \
  --data "paths[]=/api/v1/customers" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/customer-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/customer-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PUT,DELETE,OPTIONS" \
  --data "config.credentials=true" > /dev/null

echo "✅ Customer Service configured in Kong"
echo "   - GET  http://localhost:8000/api/v1/customers"
echo "   - GET  http://localhost:8000/api/v1/customers/:id"
echo "   - GET  http://localhost:8000/api/v1/customers/:id/interactions"
echo "   - GET  http://localhost:8000/api/v1/customers/:id/notes"
echo "   - POST http://localhost:8000/api/v1/customers/:id/notes"
