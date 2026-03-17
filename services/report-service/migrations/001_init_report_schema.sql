-- Report Service Database Schema
-- MS-18: Apache Superset BI integration

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  superset_dashboard_id INTEGER,
  superset_chart_id INTEGER,
  category TEXT,
  role_restrictions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_tenant ON reports(tenant_id);
CREATE INDEX idx_reports_category ON reports(category);

CREATE TABLE report_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_access_logs_report ON report_access_logs(report_id);
CREATE INDEX idx_report_access_logs_user ON report_access_logs(user_id);
