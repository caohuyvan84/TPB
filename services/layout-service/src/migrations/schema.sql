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
