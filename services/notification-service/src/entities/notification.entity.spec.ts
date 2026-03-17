import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { testDataSource } from './test-data-source';

describe('Notification Entity', () => {
  let repo: Repository<Notification>;

  beforeAll(async () => {
    await testDataSource.initialize();
    repo = testDataSource.getRepository(Notification);
  });

  afterAll(async () => {
    await testDataSource.destroy();
  });

  beforeEach(async () => {
    await repo.query('TRUNCATE TABLE notifications RESTART IDENTITY CASCADE');
  });

  it('should create notification', async () => {
    const notification = repo.create({
      tenantId: '00000000-0000-0000-0000-000000000001',
      agentId: '00000000-0000-0000-0000-000000000002',
      type: 'call',
      priority: 'high',
      state: 'new',
      title: 'Incoming Call',
      message: 'New call from customer',
    });

    const saved = await repo.save(notification);

    expect(saved.id).toBeDefined();
    expect(saved.type).toBe('call');
    expect(saved.state).toBe('new');
  });

  it('should update notification state', async () => {
    const notification = await repo.save(
      repo.create({
        tenantId: '00000000-0000-0000-0000-000000000001',
        agentId: '00000000-0000-0000-0000-000000000002',
        type: 'ticket',
        title: 'New Ticket',
        message: 'Ticket assigned',
      }),
    );

    notification.state = 'viewed';
    const updated = await repo.save(notification);

    expect(updated.state).toBe('viewed');
  });
});
