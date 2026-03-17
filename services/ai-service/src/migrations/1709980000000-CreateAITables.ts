import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAITables1709980000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ai_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        user_id UUID NOT NULL,
        type TEXT NOT NULL,
        input_text TEXT NOT NULL,
        output_text TEXT,
        model TEXT,
        tokens_used INTEGER,
        latency_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_ai_requests_user ON ai_requests(user_id)`);
    await queryRunner.query(`CREATE INDEX idx_ai_requests_type ON ai_requests(type)`);
    await queryRunner.query(`CREATE INDEX idx_ai_requests_created ON ai_requests(created_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE ai_requests`);
  }
}
