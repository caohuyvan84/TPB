import { DataSource, Repository } from 'typeorm';
import { Interaction } from './interaction.entity';
import { testDataSource } from './test-data-source';

describe('Interaction Entity', () => {
  let dataSource: DataSource;
  let repository: Repository<Interaction>;

  beforeAll(async () => {
    dataSource = await testDataSource.initialize();
    repository = dataSource.getRepository(Interaction);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await repository.query(
      'TRUNCATE TABLE interactions RESTART IDENTITY CASCADE',
    );
  });

  it('should create interaction', async () => {
    const interaction = repository.create({
      displayId: 'INT-001',
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'call',
      channel: 'voice',
      status: 'new',
      priority: 'high',
      customerId: '123e4567-e89b-12d3-a456-426614174001',
      customerName: 'John Doe',
    });

    const saved = await repository.save(interaction);

    expect(saved.id).toBeDefined();
    expect(saved.displayId).toBe('INT-001');
    expect(saved.type).toBe('call');
  });

  it('should enforce unique display_id', async () => {
    await repository.save({
      displayId: 'INT-001',
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'call',
      channel: 'voice',
      status: 'new',
      customerId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const duplicate = repository.create({
      displayId: 'INT-001',
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'chat',
      channel: 'chat',
      status: 'new',
      customerId: '123e4567-e89b-12d3-a456-426614174002',
    });

    await expect(repository.save(duplicate)).rejects.toThrow();
  });

  it('should set default values', async () => {
    const interaction = repository.create({
      displayId: 'INT-002',
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      type: 'email',
      channel: 'email',
      status: 'new',
      customerId: '123e4567-e89b-12d3-a456-426614174001',
    });

    const saved = await repository.save(interaction);

    expect(saved.priority).toBe('medium');
    expect(saved.isVip).toBe(false);
    expect(saved.slaBreached).toBe(false);
    expect(saved.tags).toEqual([]);
  });
});
