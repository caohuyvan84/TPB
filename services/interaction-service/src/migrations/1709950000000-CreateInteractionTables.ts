import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInteractionTables1709950000000
  implements MigrationInterface
{
  name = 'CreateInteractionTables1709950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        display_id TEXT UNIQUE NOT NULL,
        tenant_id UUID NOT NULL,
        type TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'medium',
        customer_id UUID NOT NULL,
        customer_name TEXT,
        assigned_agent_id UUID,
        assigned_agent_name TEXT,
        subject TEXT,
        tags TEXT[] DEFAULT '{}',
        is_vip BOOLEAN DEFAULT false,
        direction TEXT,
        source TEXT,
        metadata JSONB DEFAULT '{}',
        dynamic_fields JSONB DEFAULT '{}',
        sla_due_at TIMESTAMPTZ,
        sla_breached BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        closed_at TIMESTAMPTZ
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_interactions_customer ON interactions(customer_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_interactions_agent ON interactions(assigned_agent_id)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_interactions_status ON interactions(status)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_interactions_created ON interactions(created_at)
    `);

    await queryRunner.query(`
      CREATE TABLE interaction_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL,
        agent_name TEXT NOT NULL,
        content TEXT NOT NULL,
        tag TEXT,
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_interaction_notes_interaction ON interaction_notes(interaction_id)
    `);

    await queryRunner.query(`
      CREATE TABLE interaction_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        duration INTEGER,
        description TEXT,
        agent_id UUID,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_interaction_events_interaction ON interaction_events(interaction_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS interaction_events CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS interaction_notes CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS interactions CASCADE`);
  }
}
