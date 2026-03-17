#!/bin/bash

# Create and run schemas for remaining services
echo "🔄 Creating schemas for remaining services..."

# Create interaction service schema
mkdir -p services/interaction-service/src/migrations
cat > services/interaction-service/src/migrations/schema.sql << 'EOF'
-- Interaction Service Database Schema

CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id VARCHAR UNIQUE NOT NULL,
  tenant_id UUID NOT NULL,
  type VARCHAR NOT NULL,
  channel VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  priority VARCHAR NOT NULL DEFAULT 'medium',
  customer_id UUID NOT NULL,
  customer_name VARCHAR,
  assigned_agent_id UUID,
  assigned_agent_name VARCHAR,
  subject VARCHAR,
  tags VARCHAR[] DEFAULT '{}',
  is_vip BOOLEAN DEFAULT false,
  direction VARCHAR,
  source VARCHAR,
  metadata JSONB DEFAULT '{}',
  dynamic_fields JSONB DEFAULT '{}',
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS interaction_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  agent_name VARCHAR NOT NULL,
  content TEXT NOT NULL,
  tag VARCHAR,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL,
  type VARCHAR NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  duration INTEGER,
  description VARCHAR,
  agent_id UUID,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interactions_customer ON interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_agent ON interactions(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_interactions_status ON interactions(status);
CREATE INDEX IF NOT EXISTS idx_interactions_channel ON interactions(channel);
CREATE INDEX IF NOT EXISTS idx_interactions_created ON interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_interaction_notes_interaction ON interaction_notes(interaction_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_interaction ON interaction_events(interaction_id);
CREATE INDEX IF NOT EXISTS idx_interaction_events_timestamp ON interaction_events(timestamp);
EOF

# Run interaction service migration
echo "📦 Running interaction-service migration..."
docker exec -i tpb-postgres psql -U postgres -d interaction_db < services/interaction-service/src/migrations/schema.sql

echo "✅ Interaction service schema created!"

# Check tables
echo "🔍 Checking interaction_db tables..."
docker exec tpb-postgres psql -U postgres -d interaction_db -c "\dt"
