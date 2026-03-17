import { Repository } from 'typeorm';
import { Ticket, TicketComment } from './index';
import { testDataSource } from './test-data-source';

describe('Ticket Entities', () => {
  let ticketRepo: Repository<Ticket>;
  let commentRepo: Repository<TicketComment>;

  beforeAll(async () => {
    await testDataSource.initialize();
    ticketRepo = testDataSource.getRepository(Ticket);
    commentRepo = testDataSource.getRepository(TicketComment);
  });

  afterAll(async () => {
    await testDataSource.destroy();
  });

  beforeEach(async () => {
    await ticketRepo.query('TRUNCATE TABLE tickets RESTART IDENTITY CASCADE');
  });

  it('should create ticket', async () => {
    const ticket = ticketRepo.create({
      displayId: 'TK-2026-000001',
      tenantId: '00000000-0000-0000-0000-000000000001',
      title: 'Test Ticket',
      customerId: '00000000-0000-0000-0000-000000000002',
      status: 'open',
      priority: 'high',
    });

    const saved = await ticketRepo.save(ticket);

    expect(saved.id).toBeDefined();
    expect(saved.displayId).toBe('TK-2026-000001');
  });

  it('should create ticket with comment', async () => {
    const ticket = await ticketRepo.save(
      ticketRepo.create({
        displayId: 'TK-2026-000002',
        tenantId: '00000000-0000-0000-0000-000000000001',
        title: 'Test Ticket',
        customerId: '00000000-0000-0000-0000-000000000002',
      }),
    );

    const comment = await commentRepo.save(
      commentRepo.create({
        ticketId: ticket.id,
        agentId: '00000000-0000-0000-0000-000000000003',
        agentName: 'John Doe',
        content: 'Test comment',
      }),
    );

    expect(comment.id).toBeDefined();
    expect(comment.ticketId).toBe(ticket.id);
  });
});
