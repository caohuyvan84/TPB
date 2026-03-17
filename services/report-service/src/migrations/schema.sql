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
