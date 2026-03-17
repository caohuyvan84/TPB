#!/bin/bash

# Create all remaining schemas quickly
echo "🚀 Creating all remaining service schemas..."

# Customer Service
mkdir -p services/customer-service/src/migrations
cat > services/customer-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  cif VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR NOT NULL,
  email VARCHAR,
  phone VARCHAR,
  segment VARCHAR,
  is_vip BOOLEAN DEFAULT false,
  avatar_url VARCHAR,
  satisfaction_rating INTEGER,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  agent_name VARCHAR NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customers_cif ON customers(cif);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
EOF

# Ticket Service
mkdir -p services/ticket-service/src/migrations
cat > services/ticket-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id VARCHAR UNIQUE NOT NULL,
  tenant_id UUID NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR NOT NULL DEFAULT 'open',
  priority VARCHAR NOT NULL DEFAULT 'medium',
  category VARCHAR,
  department VARCHAR,
  assigned_agent_id UUID,
  customer_id UUID NOT NULL,
  interaction_id UUID,
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  agent_name VARCHAR NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  agent_name VARCHAR NOT NULL,
  field_name VARCHAR NOT NULL,
  old_value VARCHAR,
  new_value VARCHAR,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agent ON tickets(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);
EOF

# Notification Service
mkdir -p services/notification-service/src/migrations
cat > services/notification-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  type VARCHAR NOT NULL,
  priority VARCHAR NOT NULL DEFAULT 'medium',
  state VARCHAR NOT NULL DEFAULT 'new',
  title VARCHAR NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR,
  action_label VARCHAR,
  metadata JSONB DEFAULT '{}',
  auto_hide_seconds INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_agent ON notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_state ON notifications(state);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
EOF

echo "📦 Running migrations..."

# Run all migrations
docker exec -i tpb-postgres psql -U postgres -d customer_db < services/customer-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d ticket_db < services/ticket-service/src/migrations/schema.sql  
docker exec -i tpb-postgres psql -U postgres -d notification_db < services/notification-service/src/migrations/schema.sql

echo "✅ All core service schemas created!"

# Check results
echo "🔍 Checking all core databases..."
for db in identity_db agent_db interaction_db ticket_db customer_db notification_db; do
  echo "=== $db ==="
  docker exec tpb-postgres psql -U postgres -d $db -c "\dt" | wc -l
done
