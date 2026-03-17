import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchemaTables1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE object_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        display_name_plural TEXT NOT NULL,
        icon TEXT,
        version INTEGER DEFAULT 1,
        is_system BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_object_types_tenant ON object_types(tenant_id);

      CREATE TABLE field_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        object_type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        display_name TEXT NOT NULL,
        field_type TEXT NOT NULL,
        data_source TEXT DEFAULT 'local',
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
        group_name TEXT,
        is_core BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (object_type_id, name)
      );

      CREATE INDEX idx_field_definitions_object_type ON field_definitions(object_type_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS field_definitions CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS object_types CASCADE;`);
  }
}
