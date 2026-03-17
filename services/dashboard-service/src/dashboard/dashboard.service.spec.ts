import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DashboardService } from './dashboard.service';
import { Dashboard, DashboardWidget } from '../entities';

describe('DashboardService', () => {
  let service: DashboardService;
  let dashboardRepo: Repository<Dashboard>;
  let widgetRepo: Repository<DashboardWidget>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Dashboard),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DashboardWidget),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(DashboardService);
    dashboardRepo = module.get(getRepositoryToken(Dashboard));
    widgetRepo = module.get(getRepositoryToken(DashboardWidget));
  });

  it('should create dashboard', async () => {
    const dto = {
      name: 'Agent Dashboard',
      layout: { columns: 3 },
    };
    const dashboard = { id: '1', ...dto };
    jest.spyOn(dashboardRepo, 'create').mockReturnValue(dashboard as any);
    jest.spyOn(dashboardRepo, 'save').mockResolvedValue(dashboard as any);

    const result = await service.createDashboard('tenant-1', 'user-1', dto);
    expect(result).toEqual(dashboard);
  });

  it('should find all dashboards', async () => {
    const dashboards = [{ id: '1', name: 'Dashboard 1' }];
    jest.spyOn(dashboardRepo, 'find').mockResolvedValue(dashboards as any);

    const result = await service.findAll('tenant-1');
    expect(result).toEqual(dashboards);
  });

  it('should find one dashboard', async () => {
    const dashboard = { id: '1', name: 'Dashboard 1', widgets: [] };
    jest.spyOn(dashboardRepo, 'findOne').mockResolvedValue(dashboard as any);

    const result = await service.findOne('1', 'tenant-1');
    expect(result).toEqual(dashboard);
  });

  it('should add widget to dashboard', async () => {
    const dashboard = { id: '1', name: 'Dashboard 1' };
    const dto = {
      widgetType: 'metric_card',
      title: 'Total Calls',
      config: {},
      position: { x: 0, y: 0 },
    };
    const widget = { id: 'w1', ...dto };
    jest.spyOn(dashboardRepo, 'findOne').mockResolvedValue(dashboard as any);
    jest.spyOn(widgetRepo, 'create').mockReturnValue(widget as any);
    jest.spyOn(widgetRepo, 'save').mockResolvedValue(widget as any);

    const result = await service.addWidget('1', 'tenant-1', dto);
    expect(result).toEqual(widget);
  });

  it('should get widget data', async () => {
    const widget = { id: 'w1', widgetType: 'metric_card' };
    jest.spyOn(widgetRepo, 'findOne').mockResolvedValue(widget as any);

    const result = await service.getWidgetData('w1');
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('change');
  });

  it('should generate line chart data', async () => {
    const widget = { id: 'w1', widgetType: 'line_chart' };
    jest.spyOn(widgetRepo, 'findOne').mockResolvedValue(widget as any);

    const result = await service.getWidgetData('w1');
    expect(result).toHaveProperty('labels');
    expect(result).toHaveProperty('datasets');
  });
});
