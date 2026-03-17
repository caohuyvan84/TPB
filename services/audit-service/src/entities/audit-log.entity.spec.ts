import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { testDataSource } from './test-data-source';

describe('AuditLog Entity', () => {
  let repo: Repository<AuditLog>;

  beforeAll(async () => {
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }
    repo = testDataSource.getRepository(AuditLog);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await repo.query('TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE');
  });

  it('should create an audit log', async () => {
    const log = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      eventType: 'user.created',
      actorId: '123e4567-e89b-12d3-a456-426614174001',
      actorRole: 'admin',
      resourceType: 'user',
      resourceId: '123e4567-e89b-12d3-a456-426614174002',
      action: 'create',
      newValues: { username: 'newuser', email: 'new@example.com' },
      occurredAt: new Date(),
    });

    const saved = await repo.save(log);

    expect(saved.id).toBeDefined();
    expect(saved.sequence).toBeDefined();
    expect(saved.eventType).toBe('user.created');
  });

  it('should support hash chaining', async () => {
    const log1 = await repo.save(
      repo.create({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'test.event1',
        action: 'test',
        occurredAt: new Date(),
        eventHash: 'hash1',
      })
    );

    const log2 = await repo.save(
      repo.create({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        eventType: 'test.event2',
        action: 'test',
        occurredAt: new Date(),
        prevHash: log1.eventHash,
        eventHash: 'hash2',
      })
    );

    expect(log2.prevHash).toBe(log1.eventHash);
  });
});
