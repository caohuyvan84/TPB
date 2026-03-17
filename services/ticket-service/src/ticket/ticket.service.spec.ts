import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TicketService } from './ticket.service';
import { Ticket, TicketComment, TicketHistory } from '../entities';

describe('TicketService', () => {
  let service: TicketService;
  let mockTicketRepo: any;
  let mockCommentRepo: any;
  let mockHistoryRepo: any;

  beforeEach(async () => {
    mockTicketRepo = {
      createQueryBuilder: jest.fn(() => ({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockCommentRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockHistoryRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketService,
        {
          provide: getRepositoryToken(Ticket),
          useValue: mockTicketRepo,
        },
        {
          provide: getRepositoryToken(TicketComment),
          useValue: mockCommentRepo,
        },
        {
          provide: getRepositoryToken(TicketHistory),
          useValue: mockHistoryRepo,
        },
      ],
    }).compile();

    service = module.get<TicketService>(TicketService);
  });

  describe('listTickets', () => {
    it('should return tickets', async () => {
      await service.listTickets();
      expect(mockTicketRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      await service.listTickets({ status: 'open' });
      expect(mockTicketRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getTicket', () => {
    it('should return ticket by id', async () => {
      const ticket = { id: '1', title: 'Test' };
      mockTicketRepo.findOne.mockResolvedValue(ticket);

      const result = await service.getTicket('1');
      expect(result).toEqual(ticket);
    });

    it('should throw NotFoundException if not found', async () => {
      mockTicketRepo.findOne.mockResolvedValue(null);

      await expect(service.getTicket('1')).rejects.toThrow('Ticket not found');
    });
  });

  describe('createTicket', () => {
    it('should create ticket', async () => {
      const data = { title: 'Test', customerId: '1' };
      const ticket = { id: '1', ...data };

      mockTicketRepo.create.mockReturnValue(ticket);
      mockTicketRepo.save.mockResolvedValue(ticket);

      const result = await service.createTicket(data);
      expect(result.title).toBe('Test');
    });
  });

  describe('addComment', () => {
    it('should add comment', async () => {
      const comment = { id: '1', content: 'Test comment' };

      mockCommentRepo.create.mockReturnValue(comment);
      mockCommentRepo.save.mockResolvedValue(comment);

      const result = await service.addComment('1', 'agent-1', 'John', 'Test comment');
      expect(result.content).toBe('Test comment');
    });
  });
});
