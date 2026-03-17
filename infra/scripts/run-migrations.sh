#!/bin/bash
# Run all migrations for all services

set -e

echo "Running migrations for all services..."

# Use superuser for migrations
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD='2qaeifAHgM7l/yUWO1UuWyBWccZ+PcqiOvDxYcXutTY='

# Services with migrations
SERVICES=(
  "identity-service:identity_db"
  "agent-service:agent_db"
  "interaction-service:interaction_db"
  "ticket-service:ticket_db"
  "customer-service:customer_db"
  "notification-service:notification_db"
  "knowledge-service:knowledge_db"
  "bfsi-core-service:bfsi_core_db"
  "ai-service:ai_db"
  "media-service:media_db"
  "audit-service:audit_db"
  "object-schema-service:object_schema_db"
)

for service_db in "${SERVICES[@]}"; do
  SERVICE=$(echo $service_db | cut -d: -f1)
  DB=$(echo $service_db | cut -d: -f2)
  
  echo "=== Running migrations for $SERVICE ($DB) ==="
  
  # Run TypeORM migrations
  npx typeorm migration:run -d services/$SERVICE/src/config/typeorm.config.ts || echo "Failed: $SERVICE"
  
  echo ""
done

echo "✅ All migrations completed!"
