import { testDataSource } from './test-data-source';
import { CtiConfig } from './cti-config.entity';

describe('CtiConfig Entity', () => {
  beforeAll(async () => {
    if (!testDataSource.isInitialized) await testDataSource.initialize();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) await testDataSource.destroy();
  });

  it('should create CTI config', async () => {
    const repo = testDataSource.getRepository(CtiConfig);
    const config = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      vendor: 'genesys',
      config: { apiUrl: 'https://api.genesys.com', apiKey: 'test' },
      isActive: true,
    });
    const saved = await repo.save(config);
    expect(saved.id).toBeDefined();
    expect(saved.vendor).toBe('genesys');
  });
});
