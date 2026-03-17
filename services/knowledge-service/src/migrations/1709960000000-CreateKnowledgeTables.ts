import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKnowledgeTables1709960000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // kb_folders table
    await queryRunner.query(`
      CREATE TABLE kb_folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name TEXT NOT NULL,
        parent_id UUID REFERENCES kb_folders(id) ON DELETE CASCADE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // kb_articles table
    await queryRunner.query(`
      CREATE TABLE kb_articles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        title TEXT NOT NULL,
        summary TEXT,
        content TEXT NOT NULL,
        tags TEXT[] DEFAULT '{}',
        category TEXT,
        folder_id UUID REFERENCES kb_folders(id) ON DELETE SET NULL,
        view_count INTEGER DEFAULT 0,
        rating DECIMAL(3,2),
        dynamic_fields JSONB DEFAULT '{}',
        created_by UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // kb_bookmarks table
    await queryRunner.query(`
      CREATE TABLE kb_bookmarks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, article_id)
      )
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX idx_kb_articles_folder ON kb_articles(folder_id)`);
    await queryRunner.query(`CREATE INDEX idx_kb_articles_category ON kb_articles(category)`);
    await queryRunner.query(`CREATE INDEX idx_kb_articles_tenant ON kb_articles(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_kb_folders_parent ON kb_folders(parent_id)`);
    await queryRunner.query(`CREATE INDEX idx_kb_bookmarks_user ON kb_bookmarks(user_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE kb_bookmarks`);
    await queryRunner.query(`DROP TABLE kb_articles`);
    await queryRunner.query(`DROP TABLE kb_folders`);
  }
}
