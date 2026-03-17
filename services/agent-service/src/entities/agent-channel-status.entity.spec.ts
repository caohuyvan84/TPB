import { DataSource, Repository } from 'typeorm';
import { AgentProfile } from './agent-profile.entity';
import { AgentChannelStatus } from './agent-channel-status.entity';
import { testDataSource } from './test-data-source';

describe('AgentChannelStatus Entity', () => {
  let dataSource: DataSource;
  let profileRepo: Repository<AgentProfile>;
  let statusRepo: Repository<AgentChannelStatus>;

  beforeAll(async () => {
    dataSource = await testDataSource.initialize();
    profileRepo = dataSource.getRepository(AgentProfile);
    statusRepo = dataSource.getRepository(AgentChannelStatus);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await statusRepo.query('TRUNCATE TABLE agent_channel_status RESTART IDENTITY CASCADE');
    await profileRepo.query('TRUNCATE TABLE agent_profiles RESTART IDENTITY CASCADE');
  });

  it('should create channel status', async () => {
    const profile = await profileRepo.save({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      agentId: 'AGT001',
      displayName: 'John Doe',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const status = statusRepo.create({
      agentId: profile.id,
      channel: 'voice',
      status: 'ready',
    });

    const saved = await statusRepo.save(status);

    expect(saved.id).toBeDefined();
    expect(saved.channel).toBe('voice');
    expect(saved.status).toBe('ready');
  });

  it('should enforce unique agent_id + channel', async () => {
    const profile = await profileRepo.save({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      agentId: 'AGT001',
      displayName: 'John Doe',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    });

    await statusRepo.save({
      agentId: profile.id,
      channel: 'voice',
      status: 'ready',
    });

    const duplicate = statusRepo.create({
      agentId: profile.id,
      channel: 'voice',
      status: 'not-ready',
    });

    await expect(statusRepo.save(duplicate)).rejects.toThrow();
  });

  it('should allow multiple channels per agent', async () => {
    const profile = await profileRepo.save({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      agentId: 'AGT001',
      displayName: 'John Doe',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    });

    await statusRepo.save({
      agentId: profile.id,
      channel: 'voice',
      status: 'ready',
    });

    await statusRepo.save({
      agentId: profile.id,
      channel: 'chat',
      status: 'not-ready',
    });

    const count = await statusRepo.count({ where: { agentId: profile.id } });
    expect(count).toBe(2);
  });
});
