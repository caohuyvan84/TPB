import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InteractionService } from './interaction.service';
import { Interaction, InteractionNote } from '../entities';

describe('InteractionService', () => {
  let service: InteractionService;
  let mockInteractionRepo: any;
  let mockNoteRepo: any;

  beforeEach(async () => {
    mockInteractionRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockNoteRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InteractionService,
        {
          provide: getRepositoryToken(Interaction),
          useValue: mockInteractionRepo,
        },
        {
          provide: getRepositoryToken(InteractionNote),
          useValue: mockNoteRepo,
        },
      ],
    }).compile();

    service = module.get<InteractionService>(InteractionService);
  });

  describe('listInteractions', () => {
    it('should return list of interactions', async () => {
      const interactions = [
        { id: '1', displayId: 'INT-001', status: 'new' },
        { id: '2', displayId: 'INT-002', status: 'in-progress' },
      ];

      mockInteractionRepo.find.mockResolvedValue(interactions);

      const result = await service.listInteractions();

      expect(result).toHaveLength(2);
      expect(mockInteractionRepo.find).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      mockInteractionRepo.find.mockResolvedValue([]);

      await service.listInteractions({ status: 'new' });

      expect(mockInteractionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'new' }),
        }),
      );
    });
  });

  describe('getInteraction', () => {
    it('should return interaction by id', async () => {
      const interaction = { id: '1', displayId: 'INT-001' };

      mockInteractionRepo.findOne.mockResolvedValue(interaction);

      const result = await service.getInteraction('1');

      expect(result).toEqual(interaction);
    });

    it('should throw NotFoundException if not found', async () => {
      mockInteractionRepo.findOne.mockResolvedValue(null);

      await expect(service.getInteraction('1')).rejects.toThrow(
        'Interaction not found',
      );
    });
  });

  describe('updateStatus', () => {
    it('should update interaction status', async () => {
      const interaction = { id: '1', status: 'new' };

      mockInteractionRepo.findOne.mockResolvedValue(interaction);
      mockInteractionRepo.save.mockResolvedValue({
        ...interaction,
        status: 'in-progress',
      });

      const result = await service.updateStatus('1', 'in-progress');

      expect(result.status).toBe('in-progress');
      expect(mockInteractionRepo.save).toHaveBeenCalled();
    });
  });

  describe('assignAgent', () => {
    it('should assign agent to interaction', async () => {
      const interaction = { id: '1', assignedAgentId: null };

      mockInteractionRepo.findOne.mockResolvedValue(interaction);
      mockInteractionRepo.save.mockResolvedValue({
        ...interaction,
        assignedAgentId: 'agent-1',
      });

      const result = await service.assignAgent('1', 'agent-1', 'John Doe');

      expect(result.assignedAgentId).toBe('agent-1');
    });
  });

  describe('addNote', () => {
    it('should add note to interaction', async () => {
      const note = {
        id: 'note-1',
        interactionId: '1',
        content: 'Test note',
      };

      mockNoteRepo.create.mockReturnValue(note);
      mockNoteRepo.save.mockResolvedValue(note);

      const result = await service.addNote(
        '1',
        'agent-1',
        'John Doe',
        'Test note',
      );

      expect(result.content).toBe('Test note');
      expect(mockNoteRepo.save).toHaveBeenCalled();
    });
  });
});
