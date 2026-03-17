import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from '../entities';

describe('AuditService', () => {
  let service: AuditService;
  let mockAuditRepo: any;

  beforeEach(async () => {
    mockAuditRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((entity) => Promise.resolve({ id: 'test-id', sequence: 1, ...entity })),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
      find: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditRepo },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log an audit event', async () => {
    mockAuditRepo.findOne.mockResolvedValue(null);

    const result = await service.log({
      tenantId: 'tenant-1',
      eventType: 'user.created',
      actorId: 'user-1',
      action: 'create',
      newValues: { username: 'test' },
    });

    expect(mockAuditRepo.save).toHaveBeenCalled();
    expect(result).toHaveProperty('eventHash');
  });

  it('should chain hashes', async () => {
    mockAuditRepo.findOne.mockResolvedValue({
      eventHash: 'prev-hash',
      sequence: 1,
    });

    const result = await service.log({
      tenantId: 'tenant-1',
      eventType: 'user.updated',
      actorId: 'user-1',
      action: 'update',
    });

    expect(result.prevHash).toBe('prev-hash');
    expect(result.eventHash).toBeDefined();
  });

  it('should query audit logs', async () => {
    const result = await service.query({
      tenantId: 'tenant-1',
      limit: 50,
    });

    expect(result).toHaveProperty('logs');
    expect(result).toHaveProperty('total');
  });

  it('should verify chain integrity', async () => {
    mockAuditRepo.find.mockResolvedValue([
      { sequence: 1, eventHash: 'hash1', prevHash: null },
      { sequence: 2, eventHash: 'hash2', prevHash: 'hash1' },
      { sequence: 3, eventHash: 'hash3', prevHash: 'hash2' },
    ]);

    const result = await service.verifyChain('tenant-1');

    expect(result.valid).toBe(true);
  });

  it('should detect broken chain', async () => {
    mockAuditRepo.find.mockResolvedValue([
      { sequence: 1, eventHash: 'hash1', prevHash: null },
      { sequence: 2, eventHash: 'hash2', prevHash: 'wrong-hash' },
    ]);

    const result = await service.verifyChain('tenant-1');

    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(2);
  });
});
