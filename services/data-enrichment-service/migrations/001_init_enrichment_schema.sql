-- Data Enrichment Service Database Schema
-- MS-16: External data fetching and progressive loading

CREATE TABLE enrichment_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  auth_config JSONB NOT NULL,
  field_mappings JSONB NOT NULL,
  timeout_ms INTEGER DEFAULT 5000,
  cache_ttl_seconds INTEGER DEFAULT 300,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrichment_sources_tenant ON enrichment_sources(tenant_id);
CREATE INDEX idx_enrichment_sources_type ON enrichment_sources(type);

CREATE TABLE enrichment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  source_id UUID REFERENCES enrichment_sources(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  status TEXT NOT NULL,
  request_payload JSONB,
  response_data JSONB,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_enrichment_requests_object ON enrichment_requests(object_type, object_id);
CREATE INDEX idx_enrichment_requests_status ON enrichment_requests(status);
CREATE INDEX idx_enrichment_requests_source ON enrichment_requests(source_id);
