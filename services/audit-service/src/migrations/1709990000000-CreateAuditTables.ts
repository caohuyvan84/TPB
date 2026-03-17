import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditTables1709990000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence BIGSERIAL,
        tenant_id UUID NOT NULL,
        event_type TEXT NOT NULL,
        actor_id UUID,
        actor_role TEXT,
        resource_type TEXT,
        resource_id UUID,
        action TEXT NOT NULL,
        old_values JSONB,
        new_values JSONB,
        ip_address INET,
        user_agent TEXT,
        prev_hash TEXT,
        event_hash TEXT,
        occurred_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      ) WITH (fillfactor = 100)
    `);

    await queryRunner.query(`CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id)`);
    await queryRunner.query(`CREATE INDEX idx_audit_logs_occurred ON audit_logs(occurred_at)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE audit_logs`);
  }
}
