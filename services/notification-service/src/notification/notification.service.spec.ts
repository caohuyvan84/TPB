import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationService } from './notification.service';
import { Notification } from '../entities';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('listNotifications', () => {
    it('should return notifications for agent', async () => {
      const notifications = [
        { id: '1', agentId: 'agent-1', title: 'Test' },
      ];

      mockRepo.find.mockResolvedValue(notifications);

      const result = await service.listNotifications('agent-1');

      expect(result).toHaveLength(1);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { agentId: 'agent-1' },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockRepo.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('agent-1');

      expect(result).toBe(5);
    });
  });

  describe('updateState', () => {
    it('should update notification state', async () => {
      const notification = { id: '1', state: 'viewed' };

      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(notification);

      const result = await service.updateState('1', 'viewed');

      expect(result?.state).toBe('viewed');
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', async () => {
      mockRepo.update.mockResolvedValue({ affected: 3 });

      const result = await service.markAllRead('agent-1');

      expect(result.success).toBe(true);
    });
  });

  describe('createNotification', () => {
    it('should create notification', async () => {
      const data = { agentId: 'agent-1', title: 'Test', message: 'Test' };
      const notification = { id: '1', ...data };

      mockRepo.create.mockReturnValue(notification);
      mockRepo.save.mockResolvedValue(notification);

      const result = await service.createNotification(data);

      expect(result.title).toBe('Test');
    });
  });
});
