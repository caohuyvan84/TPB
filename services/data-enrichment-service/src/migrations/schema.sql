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
