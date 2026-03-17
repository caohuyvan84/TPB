import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AIService } from './ai.service';
import { AIRequest } from '../entities';

describe('AIService', () => {
  let service: AIService;
  let mockRequestRepo: any;

  beforeEach(async () => {
    mockRequestRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'test-id', ...entity })),
    };

    const module = await Test.createTestingModule({
      providers: [
        AIService,
        { provide: getRepositoryToken(AIRequest), useValue: mockRequestRepo },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate suggestion', async () => {
    const result = await service.suggest('Customer asking about loan', 'tenant-1', 'user-1');

    expect(result).toHaveProperty('suggestion');
    expect(result).toHaveProperty('cached');
    expect(mockRequestRepo.save).toHaveBeenCalled();
  });

  it('should return cached suggestion on second call', async () => {
    const context = 'Same question';
    
    const first = await service.suggest(context, 'tenant-1', 'user-1');
    const second = await service.suggest(context, 'tenant-1', 'user-1');

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(mockRequestRepo.save).toHaveBeenCalledTimes(1);
  });

  it('should summarize text', async () => {
    const result = await service.summarize('Long text here...', 'tenant-1', 'user-1');

    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('cached');
  });

  it('should analyze sentiment', async () => {
    const result = await service.analyzeSentiment('I am very happy', 'tenant-1', 'user-1');

    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('confidence');
    expect(['positive', 'negative', 'neutral']).toContain(result.sentiment);
  });

  it('should classify ticket', async () => {
    const result = await service.classify('I need a loan urgently', 'tenant-1', 'user-1');

    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('priority');
  });
});
