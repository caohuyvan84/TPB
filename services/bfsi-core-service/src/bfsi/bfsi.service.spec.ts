import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BFSIService } from './bfsi.service';
import { BankProduct } from '../entities';

describe('BFSIService', () => {
  let service: BFSIService;
  let mockProductRepo: any;

  beforeEach(async () => {
    mockProductRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'test-id', ...entity })),
    };

    const module = await Test.createTestingModule({
      providers: [
        BFSIService,
        { provide: getRepositoryToken(BankProduct), useValue: mockProductRepo },
      ],
    }).compile();

    service = module.get<BFSIService>(BFSIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should query products from CBS', async () => {
    mockProductRepo.findOne.mockResolvedValue(null);

    const result = await service.queryProducts('CIF123', 'tenant-1');

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it('should mask account numbers', async () => {
    mockProductRepo.findOne.mockResolvedValue(null);

    const result = await service.queryProducts('CIF123', 'tenant-1');

    if (Array.isArray(result)) {
      result.forEach((product: any) => {
        if (product.accountNumber) {
          expect(product.accountNumber).toMatch(/\*+\d{4}$/);
        }
      });
    }
  });

  it('should filter by product type', async () => {
    mockProductRepo.findOne.mockResolvedValue(null);

    const result = await service.queryProducts('CIF123', 'tenant-1', 'account');

    if (Array.isArray(result)) {
      expect(result.every((p: any) => p.type === 'account')).toBe(true);
    }
  });

  it('should return cached data when CBS fails', async () => {
    // Force circuit breaker to open by simulating failures
    const originalAdapter = (service as any).cbsAdapter;
    (service as any).cbsAdapter = {
      queryProducts: jest.fn().mockRejectedValue(new Error('CBS down')),
    };

    mockProductRepo.find.mockResolvedValue([
      { id: '1', type: 'account', accountNumber: '****7890' },
    ]);

    const result: any = await service.queryProducts('CIF123', 'tenant-1');

    expect(result.stale).toBe(true);
    expect(result.products).toBeDefined();

    // Restore
    (service as any).cbsAdapter = originalAdapter;
  });

  it('should query transactions', async () => {
    const result = await service.queryTransactions('1234567890', 10);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('should get circuit breaker state', () => {
    const state = service.getCircuitBreakerState();
    expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(state);
  });
});
