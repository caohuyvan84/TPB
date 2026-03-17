import { DataSource } from 'typeorm';
import { AgentProfile } from './agent-profile.entity';
import { AgentChannelStatus } from './agent-channel-status.entity';
import { AgentSession } from './agent-session.entity';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: 'agent_db',
  entities: [AgentProfile, AgentChannelStatus, AgentSession],
  synchronize: true,
  dropSchema: true,
});
