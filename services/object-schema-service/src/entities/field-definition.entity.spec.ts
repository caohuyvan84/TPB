import { testDataSource } from './test-data-source';
import { FieldDefinition } from './field-definition.entity';
import { ObjectType } from './object-type.entity';

describe('FieldDefinition Entity', () => {
  beforeAll(async () => {
    if (!testDataSource.isInitialized) await testDataSource.initialize();
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) await testDataSource.destroy();
  });

  afterEach(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.getRepository(FieldDefinition).clear();
      await testDataSource.getRepository(ObjectType).clear();
    }
  });

  it('should create field definition', async () => {
    const objTypeRepo = testDataSource.getRepository(ObjectType);
    const objType = await objTypeRepo.save(
      objTypeRepo.create({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: `test_obj_${Date.now()}`,
        displayName: 'Test',
        displayNamePlural: 'Tests',
      }),
    );

    const repo = testDataSource.getRepository(FieldDefinition);
    const field = repo.create({
      objectTypeId: objType.id,
      name: 'custom_field',
      displayName: 'Custom Field',
      fieldType: 'text',
      dataSource: 'local',
      isRequired: false,
      sortOrder: 0,
    });
    const saved = await repo.save(field);
    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('custom_field');
  });
});
