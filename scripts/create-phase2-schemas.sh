#!/bin/bash

# Create all remaining Phase 2 & 3 service schemas
echo "🚀 Creating Phase 2 & 3 service schemas..."

# Knowledge Service (MS-7)
mkdir -p services/knowledge-service/src/migrations
cat > services/knowledge-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title VARCHAR NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  tags VARCHAR[] DEFAULT '{}',
  category VARCHAR,
  folder_id UUID,
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  dynamic_fields JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kb_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  parent_id UUID,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (parent_id) REFERENCES kb_folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS kb_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  article_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, article_id),
  FOREIGN KEY (article_id) REFERENCES kb_articles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_kb_articles_folder ON kb_articles(folder_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category);
EOF

# BFSI Service (MS-8)
mkdir -p services/bfsi-core-service/src/migrations
cat > services/bfsi-core-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS bank_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  type VARCHAR NOT NULL,
  account_number VARCHAR,
  balance DECIMAL(20,2),
  status VARCHAR,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_products_customer ON bank_products(customer_id);
EOF

# AI Service (MS-9)
mkdir -p services/ai-service/src/migrations
cat > services/ai-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS ai_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  type VARCHAR NOT NULL,
  input_text TEXT NOT NULL,
  output_text TEXT,
  model_used VARCHAR,
  processing_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_agent ON ai_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_type ON ai_requests(type);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created ON ai_requests(created_at);
EOF

# Media Service (MS-10)
mkdir -p services/media-service/src/migrations
cat > services/media-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  filename VARCHAR NOT NULL,
  original_name VARCHAR NOT NULL,
  mime_type VARCHAR NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path VARCHAR NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL,
  media_file_id UUID NOT NULL,
  duration INTEGER,
  quality VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (media_file_id) REFERENCES media_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_media_files_uploaded_by ON media_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_call_recordings_interaction ON call_recordings(interaction_id);
EOF

# Audit Service (MS-11)
mkdir -p services/audit-service/src/migrations
cat > services/audit-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence BIGSERIAL,
  tenant_id UUID NOT NULL,
  event_type VARCHAR NOT NULL,
  actor_id UUID,
  actor_role VARCHAR,
  resource_type VARCHAR,
  resource_id UUID,
  action VARCHAR NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  prev_hash VARCHAR,
  event_hash VARCHAR,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
) WITH (fillfactor = 100);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred ON audit_logs(occurred_at);
EOF

echo "📦 Running Phase 2 migrations..."

# Run migrations
docker exec -i tpb-postgres psql -U postgres -d knowledge_db < services/knowledge-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d bfsi_db < services/bfsi-core-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d ai_db < services/ai-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d media_db < services/media-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d audit_db < services/audit-service/src/migrations/schema.sql

echo "✅ Phase 2 schemas created!"
