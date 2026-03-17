#!/bin/bash
# Configure Kong API Gateway for Identity Service

set -e

KONG_ADMIN_URL="http://localhost:8001"
IDENTITY_SERVICE_URL="http://host.docker.internal:3001"

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
curl -i -X POST "${KONG_ADMIN_URL}/services/" \
  --data "name=identity-service" \
  --data "url=${IDENTITY_SERVICE_URL}"

# Create routes for Identity Service
echo "📝 Creating routes for Identity Service..."

# Auth routes
curl -i -X POST "${KONG_ADMIN_URL}/services/identity-service/routes" \
  --data "name=auth-login" \
  --data "paths[]=/api/v1/auth/login" \
  --data "methods[]=POST"

curl -i -X POST "${KONG_ADMIN_URL}/services/identity-service/routes" \
  --data "name=auth-refresh" \
  --data "paths[]=/api/v1/auth/refresh" \
  --data "methods[]=POST"

curl -i -X POST "${KONG_ADMIN_URL}/services/identity-service/routes" \
  --data "name=auth-logout" \
  --data "paths[]=/api/v1/auth/logout" \
  --data "methods[]=POST"

curl -i -X POST "${KONG_ADMIN_URL}/services/identity-service/routes" \
  --data "name=auth-mfa-verify" \
  --data "paths[]=/api/v1/auth/mfa/verify" \
  --data "methods[]=POST"

# User routes
curl -i -X POST "${KONG_ADMIN_URL}/services/identity-service/routes" \
  --data "name=users-me" \
  --data "paths[]=/api/v1/users/me" \
  --data "methods[]=GET"

# Enable rate limiting plugin
echo "📝 Enabling rate limiting plugin..."
curl -i -X POST "${KONG_ADMIN_URL}/services/identity-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" \
  --data "config.policy=local"

# Enable CORS plugin
echo "📝 Enabling CORS plugin..."
curl -i -X POST "${KONG_ADMIN_URL}/services/identity-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PUT,DELETE,OPTIONS" \
  --data "config.headers=Accept,Authorization,Content-Type" \
  --data "config.exposed_headers=X-Auth-Token" \
  --data "config.credentials=true" \
  --data "config.max_age=3600"

# Enable request logging
echo "📝 Enabling request logging..."
curl -i -X POST "${KONG_ADMIN_URL}/services/identity-service/plugins" \
  --data "name=file-log" \
  --data "config.path=/tmp/kong-identity-service.log"

echo "✅ Kong configuration completed!"
echo ""
echo "📊 Kong endpoints:"
echo "  - Proxy: http://localhost:8000"
echo "  - Admin API: http://localhost:8001"
echo ""
echo "🔐 Identity Service routes:"
echo "  - POST http://localhost:8000/api/v1/auth/login"
echo "  - POST http://localhost:8000/api/v1/auth/refresh"
echo "  - POST http://localhost:8000/api/v1/auth/logout"
echo "  - POST http://localhost:8000/api/v1/auth/mfa/verify"
echo "  - GET  http://localhost:8000/api/v1/users/me"
