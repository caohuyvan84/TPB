#!/bin/bash
# Create all databases for TPB CRM Platform

set -e

echo "Creating all 18 databases..."

DATABASES=(
  "identity_db"
  "agent_db"
  "interaction_db"
  "ticket_db"
  "customer_db"
  "notification_db"
  "knowledge_db"
  "bfsi_db"
  "ai_db"
  "media_db"
  "audit_db"
  "object_schema_db"
  "layout_db"
  "workflow_db"
  "enrichment_db"
  "dashboard_db"
  "report_db"
  "cti_db"
)

for db in "${DATABASES[@]}"; do
  echo "Creating $db..."
  docker exec tpb-postgres psql -U postgres -c "CREATE DATABASE $db;" 2>/dev/null || echo "  (already exists)"
done

echo ""
echo "✅ All databases created!"
docker exec tpb-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -E "_db" | wc -l | xargs echo "Total databases:"
