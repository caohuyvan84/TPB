import { Repository } from 'typeorm';
import { KbFolder } from './kb-folder.entity';
import { testDataSource } from './test-data-source';

describe('KbFolder Entity', () => {
  let repo: Repository<KbFolder>;

  beforeAll(async () => {
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }
    repo = testDataSource.getRepository(KbFolder);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await repo.query('TRUNCATE TABLE kb_folders RESTART IDENTITY CASCADE');
  });

  it('should create a root folder', async () => {
    const folder = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Banking Products',
      parentId: null,
    });

    const saved = await repo.save(folder);

    expect(saved.id).toBeDefined();
    expect(saved.name).toBe('Banking Products');
    expect(saved.parentId).toBeNull();
    expect(saved.sortOrder).toBe(0);
  });

  it('should create nested folders', async () => {
    const parent = await repo.save(
      repo.create({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Products',
        parentId: null,
      })
    );

    const child = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Loans',
      parentId: parent.id,
    });

    const saved = await repo.save(child);

    expect(saved.parentId).toBe(parent.id);
  });
});
