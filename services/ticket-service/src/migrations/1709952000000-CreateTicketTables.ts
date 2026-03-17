import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketTables1709952000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        display_id TEXT UNIQUE NOT NULL,
        tenant_id UUID NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        priority TEXT NOT NULL DEFAULT 'medium',
        category TEXT,
        department TEXT,
        assigned_agent_id UUID,
        customer_id UUID NOT NULL,
        interaction_id UUID,
        due_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        dynamic_fields JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_tickets_customer ON tickets(customer_id);
      CREATE INDEX idx_tickets_agent ON tickets(assigned_agent_id);
      CREATE INDEX idx_tickets_status ON tickets(status);
      CREATE INDEX idx_tickets_created ON tickets(created_at);

      CREATE TABLE ticket_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL,
        agent_name TEXT NOT NULL,
        content TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);

      CREATE TABLE ticket_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL,
        agent_name TEXT NOT NULL,
        field_name TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX idx_ticket_history_ticket ON ticket_history(ticket_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS ticket_history;
      DROP TABLE IF EXISTS ticket_comments;
      DROP TABLE IF EXISTS tickets;
    `);
  }
}
