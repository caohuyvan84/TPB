import { DataSource, Repository } from 'typeorm';
import { AgentProfile } from './agent-profile.entity';
import { testDataSource } from './test-data-source';

describe('AgentProfile Entity', () => {
  let dataSource: DataSource;
  let repository: Repository<AgentProfile>;

  beforeAll(async () => {
    dataSource = await testDataSource.initialize();
    repository = dataSource.getRepository(AgentProfile);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await repository.query('TRUNCATE TABLE agent_profiles RESTART IDENTITY CASCADE');
  });

  it('should create agent profile', async () => {
    const profile = repository.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      agentId: 'AGT001',
      displayName: 'John Doe',
      department: 'Sales',
      team: 'Team A',
      skills: ['english', 'sales'],
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const saved = await repository.save(profile);

    expect(saved.id).toBeDefined();
    expect(saved.agentId).toBe('AGT001');
    expect(saved.skills).toEqual(['english', 'sales']);
  });

  it('should enforce unique agent_id', async () => {
    const profile1 = repository.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      agentId: 'AGT001',
      displayName: 'John Doe',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    });

    await repository.save(profile1);

    const profile2 = repository.create({
      userId: '123e4567-e89b-12d3-a456-426614174002',
      agentId: 'AGT001',
      displayName: 'Jane Doe',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    });

    await expect(repository.save(profile2)).rejects.toThrow();
  });

  it('should set default values', async () => {
    const profile = repository.create({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      agentId: 'AGT001',
      displayName: 'John Doe',
      tenantId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const saved = await repository.save(profile);

    expect(saved.maxConcurrentChats).toBe(3);
    expect(saved.maxConcurrentEmails).toBe(5);
    expect(saved.skills).toEqual([]);
  });
});
