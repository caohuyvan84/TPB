#!/bin/bash
# Test Kong configuration with Identity Service

set -e

KONG_ADMIN_URL="http://localhost:8001"
IDENTITY_SERVICE_URL="http://localhost:3001"

echo "🔧 Configuring Kong API Gateway for Identity Service..."

# Wait for Kong to be ready
echo "⏳ Waiting for Kong Admin API..."
until curl -s -f "${KONG_ADMIN_URL}" > /dev/null; do
  echo "Waiting for Kong..."
  sleep 2
done
echo "✅ Kong is ready"

# Create Identity Service
echo "📝 Creating Identity Service..."
curl -s -X POST "${KONG_ADMIN_URL}/services/" \
  --data "name=identity-service" \
  --data "url=${IDENTITY_SERVICE_URL}" > /dev/null

# Create routes for Identity Service
echo "📝 Creating routes for Identity Service..."

curl -s -X POST "${KONG_ADMIN_URL}/services/identity-service/routes" \
  --data "name=auth-routes" \
  --data "paths[]=/api/v1/auth" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "${KONG_ADMIN_URL}/services/identity-service/routes" \
  --data "name=users-routes" \
  --data "paths[]=/api/v1/users" \
  --data "strip_path=false" > /dev/null

# Enable rate limiting plugin
echo "📝 Enabling rate limiting plugin..."
curl -s -X POST "${KONG_ADMIN_URL}/services/identity-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" \
  --data "config.policy=local" > /dev/null

# Enable CORS plugin
echo "📝 Enabling CORS plugin..."
curl -s -X POST "${KONG_ADMIN_URL}/services/identity-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PUT,DELETE,OPTIONS" \
  --data "config.headers=Accept,Authorization,Content-Type" \
  --data "config.exposed_headers=X-Auth-Token" \
  --data "config.credentials=true" \
  --data "config.max_age=3600" > /dev/null

echo "✅ Kong configuration completed!"
echo ""
echo "📊 Kong endpoints:"
echo "  - Proxy: http://localhost:8000"
echo "  - Admin API: http://localhost:8001"
echo ""
echo "🔐 Identity Service routes (via Kong):"
echo "  - POST http://localhost:8000/api/v1/auth/login"
echo "  - POST http://localhost:8000/api/v1/auth/refresh"
echo "  - POST http://localhost:8000/api/v1/auth/logout"
echo "  - POST http://localhost:8000/api/v1/auth/mfa/verify"
echo "  - GET  http://localhost:8000/api/v1/users/me"
