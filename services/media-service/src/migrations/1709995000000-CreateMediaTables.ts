import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMediaTables1709995000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE media_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        uploaded_by UUID NOT NULL,
        file_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size BIGINT NOT NULL,
        storage_path TEXT NOT NULL,
        storage_bucket TEXT NOT NULL,
        category TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_media_files_tenant ON media_files(tenant_id);
      CREATE INDEX idx_media_files_uploaded_by ON media_files(uploaded_by);

      CREATE TABLE call_recordings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        interaction_id UUID NOT NULL,
        media_file_id UUID NOT NULL,
        call_direction TEXT NOT NULL,
        duration INTEGER NOT NULL,
        recording_start TIMESTAMPTZ NOT NULL,
        recording_end TIMESTAMPTZ NOT NULL,
        transcript TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_call_recordings_tenant ON call_recordings(tenant_id);
      CREATE INDEX idx_call_recordings_interaction ON call_recordings(interaction_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS call_recordings CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS media_files CASCADE;`);
  }
}
