import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportService } from './report.service';
import { Report, ReportAccessLog } from '../entities';

describe('ReportService', () => {
  let service: ReportService;
  let reportRepo: Repository<Report>;
  let accessLogRepo: Repository<ReportAccessLog>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReportService,
        {
          provide: getRepositoryToken(Report),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ReportAccessLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(ReportService);
    reportRepo = module.get(getRepositoryToken(Report));
    accessLogRepo = module.get(getRepositoryToken(ReportAccessLog));
  });

  it('should create report', async () => {
    const dto = {
      name: 'Agent Performance Report',
      supersetDashboardId: 123,
    };
    const report = { id: '1', ...dto };
    jest.spyOn(reportRepo, 'create').mockReturnValue(report as any);
    jest.spyOn(reportRepo, 'save').mockResolvedValue(report as any);

    const result = await service.createReport('tenant-1', 'user-1', dto);
    expect(result).toEqual(report);
  });

  it('should find all reports', async () => {
    const reports = [{ id: '1', name: 'Report 1' }];
    jest.spyOn(reportRepo, 'find').mockResolvedValue(reports as any);

    const result = await service.findAll('tenant-1');
    expect(result).toEqual(reports);
  });

  it('should find one report', async () => {
    const report = { id: '1', name: 'Report 1' };
    jest.spyOn(reportRepo, 'findOne').mockResolvedValue(report as any);

    const result = await service.findOne('1', 'tenant-1');
    expect(result).toEqual(report);
  });

  it('should generate guest token', async () => {
    const report = {
      id: '1',
      name: 'Report 1',
      tenantId: 'tenant-1',
      supersetDashboardId: 123,
    };
    jest.spyOn(reportRepo, 'findOne').mockResolvedValue(report as any);
    jest.spyOn(accessLogRepo, 'create').mockReturnValue({} as any);
    jest.spyOn(accessLogRepo, 'save').mockResolvedValue({} as any);

    const result = await service.generateGuestToken('1', 'tenant-1', 'user-1');
    expect(result).toHaveProperty('token');
    expect(result).toHaveProperty('expiresAt');
  });

  it('should log report access', async () => {
    const report = {
      id: '1',
      name: 'Report 1',
      tenantId: 'tenant-1',
      supersetDashboardId: 123,
    };
    const accessLog = { id: 'log-1', reportId: '1', userId: 'user-1' };
    jest.spyOn(reportRepo, 'findOne').mockResolvedValue(report as any);
    jest.spyOn(accessLogRepo, 'create').mockReturnValue(accessLog as any);
    jest.spyOn(accessLogRepo, 'save').mockResolvedValue(accessLog as any);

    await service.generateGuestToken('1', 'tenant-1', 'user-1');
    expect(accessLogRepo.save).toHaveBeenCalled();
  });
});
