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
