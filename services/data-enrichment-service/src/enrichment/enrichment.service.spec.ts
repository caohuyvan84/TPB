import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EnrichmentService } from './enrichment.service';
import { EnrichmentSource, EnrichmentRequest } from '../entities';

describe('EnrichmentService', () => {
  let service: EnrichmentService;
  let sourceRepo: Repository<EnrichmentSource>;
  let requestRepo: Repository<EnrichmentRequest>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EnrichmentService,
        {
          provide: getRepositoryToken(EnrichmentSource),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findByIds: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EnrichmentRequest),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(EnrichmentService);
    sourceRepo = module.get(getRepositoryToken(EnrichmentSource));
    requestRepo = module.get(getRepositoryToken(EnrichmentRequest));
  });

  it('should create enrichment source', async () => {
    const dto = {
      name: 'CBS API',
      type: 'cbs',
      endpoint: 'https://cbs.example.com/api',
      authConfig: { apiKey: 'secret' },
      fieldMappings: { balance: 'account.balance' },
    };
    const source = { id: '1', ...dto };
    jest.spyOn(sourceRepo, 'create').mockReturnValue(source as any);
    jest.spyOn(sourceRepo, 'save').mockResolvedValue(source as any);

    const result = await service.createSource('tenant-1', dto);
    expect(result).toEqual(source);
  });

  it('should find all sources', async () => {
    const sources = [{ id: '1', name: 'CBS API' }];
    jest.spyOn(sourceRepo, 'find').mockResolvedValue(sources as any);

    const result = await service.findAllSources('tenant-1');
    expect(result).toEqual(sources);
  });

  it('should request enrichment', async () => {
    const source = {
      id: 'source-1',
      name: 'CBS',
      cacheTtlSeconds: 300,
    };
    const dto = {
      objectType: 'customer',
      objectId: 'cust-1',
    };
    jest.spyOn(sourceRepo, 'find').mockResolvedValue([source] as any);
    jest.spyOn(requestRepo, 'create').mockReturnValue({ status: 'pending' } as any);
    jest.spyOn(requestRepo, 'save').mockResolvedValue({ id: 'req-1', status: 'completed' } as any);

    const result = await service.requestEnrichment('tenant-1', dto);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
  });

  it('should get request status', async () => {
    const request = { id: 'req-1', status: 'completed' };
    jest.spyOn(requestRepo, 'findOne').mockResolvedValue(request as any);

    const result = await service.getRequestStatus('req-1', 'tenant-1');
    expect(result).toEqual(request);
  });

  it('should use cache for repeated requests', async () => {
    const source = {
      id: 'source-1',
      name: 'CBS',
      cacheTtlSeconds: 300,
    };
    const dto = {
      objectType: 'customer',
      objectId: 'cust-1',
    };
    jest.spyOn(sourceRepo, 'find').mockResolvedValue([source] as any);
    jest.spyOn(requestRepo, 'create').mockReturnValue({ status: 'pending' } as any);
    jest.spyOn(requestRepo, 'save').mockResolvedValue({ id: 'req-1', status: 'completed' } as any);

    // First request
    await service.requestEnrichment('tenant-1', dto);
    
    // Second request should use cache
    const result = await service.requestEnrichment('tenant-1', dto);
    expect(result[0].id).toBe('cached');
  });
});
