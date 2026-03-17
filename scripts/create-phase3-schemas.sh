#!/bin/bash

# Create Phase 3 service schemas
echo "🚀 Creating Phase 3 service schemas..."

# Object Schema Service (MS-13)
mkdir -p services/object-schema-service/src/migrations
cat > services/object-schema-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR UNIQUE NOT NULL,
  display_name VARCHAR NOT NULL,
  display_name_plural VARCHAR NOT NULL,
  icon VARCHAR,
  version INTEGER DEFAULT 1,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  display_name VARCHAR NOT NULL,
  field_type VARCHAR NOT NULL,
  data_source VARCHAR DEFAULT 'local',
  enrichment_source_id UUID,
  is_required BOOLEAN DEFAULT false,
  is_read_only BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT false,
  is_sortable BOOLEAN DEFAULT false,
  is_filterable BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  is_unique BOOLEAN DEFAULT false,
  default_value JSONB,
  validation_rules JSONB DEFAULT '[]',
  display_config JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  group_name VARCHAR,
  is_core BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (object_type_id, name),
  FOREIGN KEY (object_type_id) REFERENCES object_types(id) ON DELETE CASCADE
);
EOF

# Layout Service (MS-14)
mkdir -p services/layout-service/src/migrations
cat > services/layout-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  object_type VARCHAR NOT NULL,
  context VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  role_restrictions VARCHAR[] DEFAULT '{}',
  config JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_layouts_object_type ON layouts(object_type);
CREATE INDEX IF NOT EXISTS idx_layouts_context ON layouts(context);
EOF

# Workflow Service (MS-15)
mkdir -p services/workflow-service/src/migrations
cat > services/workflow-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  trigger JSONB NOT NULL,
  steps JSONB NOT NULL,
  variables JSONB DEFAULT '[]',
  error_handling JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  status VARCHAR NOT NULL,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (workflow_id) REFERENCES workflow_definitions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workflow_step_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  step_name VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE
);
EOF

# Data Enrichment Service (MS-16)
mkdir -p services/data-enrichment-service/src/migrations
cat > services/data-enrichment-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS enrichment_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrichment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_id UUID NOT NULL,
  object_type VARCHAR NOT NULL,
  object_id UUID NOT NULL,
  status VARCHAR NOT NULL,
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  FOREIGN KEY (source_id) REFERENCES enrichment_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_enrichment_requests_object ON enrichment_requests(object_type, object_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_requests_status ON enrichment_requests(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_requests_created ON enrichment_requests(created_at);
EOF

# Dashboard Service (MS-17)
mkdir -p services/dashboard-service/src/migrations
cat > services/dashboard-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  layout JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  role_restrictions VARCHAR[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL,
  widget_type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  config JSONB NOT NULL,
  position JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
);
EOF

# Report Service (MS-18)
mkdir -p services/report-service/src/migrations
cat > services/report-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  superset_dashboard_id INTEGER,
  superset_chart_id INTEGER,
  role_restrictions VARCHAR[] DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  user_id UUID NOT NULL,
  access_type VARCHAR NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_report_access_logs_report ON report_access_logs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_user ON report_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_access_logs_accessed ON report_access_logs(accessed_at);
EOF

# CTI Service (MS-19)
mkdir -p services/cti-adapter-service/src/migrations
cat > services/cti-adapter-service/src/migrations/schema.sql << 'EOF'
CREATE TABLE IF NOT EXISTS cti_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider VARCHAR NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
EOF

echo "📦 Running Phase 3 migrations..."

# Run migrations
docker exec -i tpb-postgres psql -U postgres -d object_schema_db < services/object-schema-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d layout_db < services/layout-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d workflow_db < services/workflow-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d enrichment_db < services/data-enrichment-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d dashboard_db < services/dashboard-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d report_db < services/report-service/src/migrations/schema.sql
docker exec -i tpb-postgres psql -U postgres -d cti_db < services/cti-adapter-service/src/migrations/schema.sql

echo "✅ Phase 3 schemas created!"

# Final check
echo "🔍 Final database check..."
for db in knowledge_db bfsi_db ai_db media_db audit_db object_schema_db layout_db workflow_db enrichment_db dashboard_db report_db cti_db; do
  count=$(docker exec tpb-postgres psql -U postgres -d $db -c "\dt" 2>/dev/null | wc -l)
  echo "$db: $count tables"
done
