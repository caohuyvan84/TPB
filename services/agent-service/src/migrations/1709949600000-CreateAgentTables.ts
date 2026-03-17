import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAgentTables1709949600000 implements MigrationInterface {
  name = 'CreateAgentTables1709949600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // agent_profiles table
    await queryRunner.query(`
      CREATE TABLE agent_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        agent_id TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        department TEXT,
        team TEXT,
        skills JSONB DEFAULT '[]',
        max_concurrent_chats INTEGER DEFAULT 3,
        max_concurrent_emails INTEGER DEFAULT 5,
        tenant_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_agent_profiles_user ON agent_profiles(user_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_agent_profiles_agent_id ON agent_profiles(agent_id)
    `);

    // agent_channel_status table
    await queryRunner.query(`
      CREATE TABLE agent_channel_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agent_profiles(id) ON DELETE CASCADE,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        custom_reason TEXT,
        changed_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (agent_id, channel)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_agent_status_agent ON agent_channel_status(agent_id)
    `);

    // agent_sessions table
    await queryRunner.query(`
      CREATE TABLE agent_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID REFERENCES agent_profiles(id) ON DELETE CASCADE,
        login_at TIMESTAMPTZ NOT NULL,
        logout_at TIMESTAMPTZ,
        connection_status TEXT DEFAULT 'connected',
        last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
        ip_address INET,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_agent_sessions_agent ON agent_sessions(agent_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS agent_sessions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS agent_channel_status CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS agent_profiles CASCADE`);
  }
}
