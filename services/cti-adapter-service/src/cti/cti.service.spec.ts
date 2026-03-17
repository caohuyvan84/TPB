import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CtiService } from './cti.service';
import { CtiConfig } from '../entities';

describe('CtiService', () => {
  let service: CtiService;
  let configRepo: any;

  beforeEach(async () => {
    configRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'config-1', ...data })),
    };

    const module = await Test.createTestingModule({
      providers: [
        CtiService,
        { provide: getRepositoryToken(CtiConfig), useValue: configRepo },
      ],
    }).compile();

    service = module.get(CtiService);
  });

  it('should answer call', async () => {
    configRepo.findOne.mockResolvedValue({
      tenantId: 'tenant-1',
      vendor: 'mock',
      config: {},
      isActive: true,
    });

    const result = await service.answerCall('tenant-1', 'call-1');
    expect(result.success).toBe(true);
  });

  it('should hangup call', async () => {
    configRepo.findOne.mockResolvedValue({
      tenantId: 'tenant-1',
      vendor: 'mock',
      config: {},
      isActive: true,
    });

    const result = await service.hangupCall('tenant-1', 'call-1');
    expect(result.success).toBe(true);
  });

  it('should hold call', async () => {
    configRepo.findOne.mockResolvedValue({
      tenantId: 'tenant-1',
      vendor: 'mock',
      config: {},
      isActive: true,
    });

    const result = await service.holdCall('tenant-1', 'call-1');
    expect(result.success).toBe(true);
  });

  it('should transfer call', async () => {
    configRepo.findOne.mockResolvedValue({
      tenantId: 'tenant-1',
      vendor: 'mock',
      config: {},
      isActive: true,
    });

    const result = await service.transferCall('tenant-1', 'call-1', 'agent-2');
    expect(result.success).toBe(true);
  });

  it('should get config', async () => {
    configRepo.findOne.mockResolvedValue({
      id: 'config-1',
      tenantId: 'tenant-1',
      vendor: 'genesys',
    });

    const result = await service.getConfig('tenant-1');
    expect(result).toBeDefined();
    expect(result!.vendor).toBe('genesys');
  });

  it('should update config', async () => {
    configRepo.findOne.mockResolvedValue(null);

    const result = await service.updateConfig('tenant-1', {
      vendor: 'avaya',
      config: { apiUrl: 'https://api.avaya.com' },
    });
    expect(result.id).toBe('config-1');
  });
});
