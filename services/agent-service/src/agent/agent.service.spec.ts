import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { AgentProfile, AgentChannelStatus, AgentSession } from '../entities';

describe('AgentService', () => {
  let service: AgentService;
  let mockProfileRepo: any;
  let mockStatusRepo: any;
  let mockSessionRepo: any;

  beforeEach(async () => {
    mockProfileRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockStatusRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockSessionRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        {
          provide: getRepositoryToken(AgentProfile),
          useValue: mockProfileRepo,
        },
        {
          provide: getRepositoryToken(AgentChannelStatus),
          useValue: mockStatusRepo,
        },
        {
          provide: getRepositoryToken(AgentSession),
          useValue: mockSessionRepo,
        },
      ],
    }).compile();

    service = module.get<AgentService>(AgentService);
  });

  describe('getAgentProfile', () => {
    it('should return agent profile', async () => {
      const profile = {
        id: 'agent-1',
        userId: 'user-1',
        agentId: 'AGT001',
        displayName: 'John Doe',
      };

      mockProfileRepo.findOne.mockResolvedValue(profile);

      const result = await service.getAgentProfile('user-1');

      expect(result).toEqual(profile);
      expect(mockProfileRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: ['channelStatuses'],
      });
    });

    it('should throw NotFoundException if profile not found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      await expect(service.getAgentProfile('user-1')).rejects.toThrow(
        'Agent profile not found',
      );
    });
  });

  describe('getChannelStatuses', () => {
    it('should return channel statuses', async () => {
      const statuses = [
        { channel: 'voice', status: 'ready' },
        { channel: 'chat', status: 'not-ready' },
      ];

      mockStatusRepo.find.mockResolvedValue(statuses);

      const result = await service.getChannelStatuses('agent-1');

      expect(result).toEqual(statuses);
    });
  });

  describe('setChannelStatus', () => {
    it('should create new status if not exists', async () => {
      mockStatusRepo.findOne.mockResolvedValue(null);
      mockStatusRepo.create.mockReturnValue({
        agentId: 'agent-1',
        channel: 'voice',
        status: 'ready',
      });
      mockStatusRepo.save.mockResolvedValue({
        id: 'status-1',
        agentId: 'agent-1',
        channel: 'voice',
        status: 'ready',
      });

      const result = await service.setChannelStatus('agent-1', 'voice', 'ready');

      expect(result.status).toBe('ready');
      expect(mockStatusRepo.create).toHaveBeenCalled();
    });

    it('should update existing status', async () => {
      const existing = {
        id: 'status-1',
        agentId: 'agent-1',
        channel: 'voice',
        status: 'ready',
      };

      mockStatusRepo.findOne.mockResolvedValue(existing);
      mockStatusRepo.save.mockResolvedValue({
        ...existing,
        status: 'not-ready',
      });

      const result = await service.setChannelStatus(
        'agent-1',
        'voice',
        'not-ready',
      );

      expect(result.status).toBe('not-ready');
    });
  });

  describe('heartbeat', () => {
    it('should update session heartbeat', async () => {
      const session = {
        id: 'session-1',
        agentId: 'agent-1',
        lastHeartbeatAt: new Date('2026-01-01'),
      };

      mockSessionRepo.findOne.mockResolvedValue(session);
      mockSessionRepo.save.mockResolvedValue(session);

      const result = await service.heartbeat('agent-1');

      expect(result.success).toBe(true);
      expect(mockSessionRepo.save).toHaveBeenCalled();
    });

    it('should return success even if no active session', async () => {
      mockSessionRepo.findOne.mockResolvedValue(null);

      const result = await service.heartbeat('agent-1');

      expect(result.success).toBe(true);
    });
  });

  describe('listAgents', () => {
    it('should return list of agents', async () => {
      const agents = [
        { id: 'agent-1', agentId: 'AGT001', displayName: 'John Doe' },
        { id: 'agent-2', agentId: 'AGT002', displayName: 'Jane Doe' },
      ];

      mockProfileRepo.find.mockResolvedValue(agents);

      const result = await service.listAgents();

      expect(result).toHaveLength(2);
      expect(result[0].agentId).toBe('AGT001');
    });
  });

  describe('checkAvailability', () => {
    it('should return availability status', async () => {
      const profile = { id: 'agent-1', agentId: 'AGT001' };
      const statuses = [
        { channel: 'voice', status: 'ready' },
        { channel: 'chat', status: 'not-ready' },
      ];

      mockProfileRepo.findOne.mockResolvedValue(profile);
      mockStatusRepo.find.mockResolvedValue(statuses);

      const result = await service.checkAvailability('AGT001');

      expect(result.available).toBe(true);
      expect(result.channels).toHaveLength(2);
    });
  });
});
