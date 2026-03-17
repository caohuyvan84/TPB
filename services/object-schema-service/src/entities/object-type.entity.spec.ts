import { testDataSource } from './test-data-source';
import { ObjectType } from './object-type.entity';

describe('ObjectType Entity', () => {
  beforeAll(async () => {
    if (!testDataSource.isInitialized) await testDataSource.initialize();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) await testDataSource.destroy();
  });

  afterEach(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.getRepository(ObjectType).clear();
    }
  });

  it('should create object type', async () => {
    const repo = testDataSource.getRepository(ObjectType);
    const objType = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      name: `custom_object_${Date.now()}`,
      displayName: 'Custom Object',
      displayNamePlural: 'Custom Objects',
      version: 1,
    });
    const saved = await repo.save(objType);
    expect(saved.id).toBeDefined();
    expect(saved.displayName).toBe('Custom Object');
  });
});
