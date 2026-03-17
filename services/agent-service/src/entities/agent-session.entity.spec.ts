import { DataSource, Repository } from 'typeorm';
import { AgentProfile } from './agent-profile.entity';
import { AgentSession } from './agent-session.entity';
import { testDataSource } from './test-data-source';

describe('AgentSession Entity', () => {
  let dataSource: DataSource;
  let profileRepo: Repository<AgentProfile>;
  let sessionRepo: Repository<AgentSession>;

  beforeAll(async () => {
    dataSource = await testDataSource.initialize();
    profileRepo = dataSource.getRepository(AgentProfile);
    sessionRepo = dataSource.getRepository(AgentSession);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await sessionRepo.query('TRUNCATE TABLE agent_sessions RESTART IDENTITY CASCADE');
    await profileRepo.query('TRUNCATE TABLE agent_profiles RESTART IDENTITY CASCADE');
  });

  it('should create session', async () => {
    const profile = await profileRepo.save({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      agentId: 'AGT001',
      displayName: 'John Doe',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const session = sessionRepo.create({
      agentId: profile.id,
      loginAt: new Date(),
      ipAddress: '192.168.1.1',
    });

    const saved = await sessionRepo.save(session);

    expect(saved.id).toBeDefined();
    expect(saved.connectionStatus).toBe('connected');
    expect(saved.ipAddress).toBe('192.168.1.1');
  });

  it('should track heartbeat', async () => {
    const profile = await profileRepo.save({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      agentId: 'AGT001',
      displayName: 'John Doe',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const session = await sessionRepo.save({
      agentId: profile.id,
      loginAt: new Date(),
    });

    const before = session.lastHeartbeatAt;
    await new Promise((resolve) => setTimeout(resolve, 100));

    session.lastHeartbeatAt = new Date();
    await sessionRepo.save(session);

    const updated = await sessionRepo.findOneBy({ id: session.id });
    expect(updated!.lastHeartbeatAt.getTime()).toBeGreaterThan(before.getTime());
  });
});
