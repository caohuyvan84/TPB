import { DataSource } from 'typeorm';

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: 'ticket_db',
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
  });

  await dataSource.initialize();

  const ticketRepo = dataSource.getRepository('Ticket');
  const commentRepo = dataSource.getRepository('TicketComment');

  // Create 10 sample tickets
  const tickets = [];
  const statuses = ['new', 'in-progress', 'pending', 'resolved', 'closed'];
  const priorities = ['low', 'medium', 'high', 'urgent'];
  const categories = ['Technical Support', 'Account Management', 'Billing & Payment', 'Customer Complaint', 'General Inquiry'];

  for (let i = 1; i <= 10; i++) {
    const ticket = await ticketRepo.save({
      displayId: `TKT-2026-${String(i).padStart(6, '0')}`,
      tenantId: '00000000-0000-0000-0000-000000000000',
      title: `Ticket ${i} - ${categories[i % categories.length]}`,
      description: `This is a sample ticket description for ticket ${i}. Customer needs assistance with ${categories[i % categories.length]}.`,
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      category: categories[i % categories.length],
      department: 'Customer Service',
      customerId: '00000000-0000-0000-0000-000000000001',
      assignedAgentId: i % 2 === 0 ? '00000000-0000-0000-0000-000000000001' : null,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000),
    });

    tickets.push(ticket);

    // Add 2-3 comments per ticket
    const numComments = 2 + (i % 2);
    for (let j = 1; j <= numComments; j++) {
      await commentRepo.save({
        ticketId: ticket.id,
        agentId: '00000000-0000-0000-0000-000000000001',
        agentName: `Agent ${j % 3 === 0 ? 'Mai' : j % 3 === 1 ? 'Duc' : 'Linh'}`,
        content: `Comment ${j} for ticket ${i}. This is a sample comment with some details about the ticket progress.`,
        isInternal: j % 3 === 0,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000 + j * 60 * 60 * 1000),
      });
    }
  }

  console.log(`✅ Created ${tickets.length} tickets with comments`);
  await dataSource.destroy();
}

seed().catch(console.error);
