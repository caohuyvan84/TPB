import { Repository } from 'typeorm';
import { AIRequest } from './ai-request.entity';
import { testDataSource } from './test-data-source';

describe('AIRequest Entity', () => {
  let repo: Repository<AIRequest>;

  beforeAll(async () => {
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }
    repo = testDataSource.getRepository(AIRequest);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await repo.query('TRUNCATE TABLE ai_requests RESTART IDENTITY CASCADE');
  });

  it('should create an AI request', async () => {
    const request = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      type: 'suggest',
      inputText: 'Customer asking about loan rates',
      outputText: 'Our current loan rates start at 8.5% per annum...',
      model: 'gpt-4',
      tokensUsed: 150,
      latencyMs: 1200,
    });

    const saved = await repo.save(request);

    expect(saved.id).toBeDefined();
    expect(saved.type).toBe('suggest');
    expect(saved.tokensUsed).toBe(150);
  });

  it('should support different request types', async () => {
    const types = ['suggest', 'summarize', 'sentiment', 'classify'];
    
    for (const type of types) {
      const request = repo.create({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type,
        inputText: 'Test input',
      });
      await repo.save(request);
    }

    const count = await repo.count();
    expect(count).toBe(4);
  });
});
