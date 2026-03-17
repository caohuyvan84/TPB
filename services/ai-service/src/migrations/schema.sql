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
