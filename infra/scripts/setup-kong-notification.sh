#!/bin/bash
# Configure Kong for Notification Service

KONG_ADMIN="http://localhost:8001"
NOTIFICATION_URL="http://host.docker.internal:3006"

echo "🔧 Configuring Kong for Notification Service..."

curl -s -X POST "$KONG_ADMIN/services/" \
  --data "name=notification-service" \
  --data "url=$NOTIFICATION_URL" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/notification-service/routes" \
  --data "name=notification-routes" \
  --data "paths[]=/api/v1/notifications" \
  --data "strip_path=false" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/notification-service/plugins" \
  --data "name=rate-limiting" \
  --data "config.minute=100" > /dev/null

curl -s -X POST "$KONG_ADMIN/services/notification-service/plugins" \
  --data "name=cors" \
  --data "config.origins=http://localhost:3000" \
  --data "config.methods=GET,POST,PATCH,OPTIONS" \
  --data "config.credentials=true" > /dev/null

echo "✅ Notification Service configured in Kong"
echo "   - GET   http://localhost:8000/api/v1/notifications"
echo "   - GET   http://localhost:8000/api/v1/notifications/unread-count"
echo "   - PATCH http://localhost:8000/api/v1/notifications/:id/state"
echo "   - POST  http://localhost:8000/api/v1/notifications/mark-all-read"
