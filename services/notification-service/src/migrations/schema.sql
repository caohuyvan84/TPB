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
