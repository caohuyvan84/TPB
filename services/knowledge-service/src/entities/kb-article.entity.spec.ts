import { Repository } from 'typeorm';
import { KbArticle } from './kb-article.entity';
import { testDataSource } from './test-data-source';

describe('KbArticle Entity', () => {
  let repo: Repository<KbArticle>;

  beforeAll(async () => {
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }
    repo = testDataSource.getRepository(KbArticle);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await repo.query('TRUNCATE TABLE kb_articles RESTART IDENTITY CASCADE');
  });

  it('should create a kb article', async () => {
    const article = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'How to reset password',
      content: 'Step 1: Click forgot password...',
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
    });

    const saved = await repo.save(article);

    expect(saved.id).toBeDefined();
    expect(saved.title).toBe('How to reset password');
    expect(saved.viewCount).toBe(0);
    expect(saved.tags).toEqual([]);
  });

  it('should store tags array', async () => {
    const article = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Account opening',
      content: 'Process for opening new account',
      tags: ['account', 'onboarding', 'kyc'],
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
    });

    const saved = await repo.save(article);

    expect(saved.tags).toEqual(['account', 'onboarding', 'kyc']);
  });

  it('should store dynamic fields', async () => {
    const article = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Loan products',
      content: 'Available loan products',
      dynamicFields: { department: 'lending', approvalRequired: true },
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
    });

    const saved = await repo.save(article);

    expect(saved.dynamicFields).toEqual({ department: 'lending', approvalRequired: true });
  });
});
