import { testDataSource } from './test-data-source';
import { Layout } from './layout.entity';

describe('Layout Entity', () => {
  beforeAll(async () => {
    if (!testDataSource.isInitialized) await testDataSource.initialize();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) await testDataSource.destroy();
  });

  it('should create layout', async () => {
    const repo = testDataSource.getRepository(Layout);
    const layout = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      objectType: 'customer',
      context: 'detail',
      name: 'Default Customer Detail',
      isDefault: true,
      config: { sections: [] },
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
    });
    const saved = await repo.save(layout);
    expect(saved.id).toBeDefined();
    expect(saved.objectType).toBe('customer');
  });
});
