import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationTables1709953000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        agent_id UUID NOT NULL,
        type TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        state TEXT NOT NULL DEFAULT 'new',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        action_url TEXT,
        action_label TEXT,
        metadata JSONB DEFAULT '{}',
        auto_hide_seconds INTEGER,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_notifications_agent ON notifications(agent_id);
      CREATE INDEX idx_notifications_state ON notifications(state);
      CREATE INDEX idx_notifications_created ON notifications(created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notifications;`);
  }
}
