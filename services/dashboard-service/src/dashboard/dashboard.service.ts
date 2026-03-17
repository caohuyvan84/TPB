import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dashboard, DashboardWidget } from '../entities';
import { CreateDashboardDto, CreateWidgetDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Dashboard)
    private dashboardRepo: Repository<Dashboard>,
    @InjectRepository(DashboardWidget)
    private widgetRepo: Repository<DashboardWidget>,
  ) {}

  async createDashboard(tenantId: string, userId: string, dto: CreateDashboardDto) {
    const dashboard = this.dashboardRepo.create({
      tenantId,
      createdBy: userId,
      ...dto,
    });
    return this.dashboardRepo.save(dashboard);
  }

  async findAll(tenantId: string) {
    return this.dashboardRepo.find({
      where: { tenantId, isActive: true },
      relations: ['widgets'],
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.dashboardRepo.findOne({
      where: { id, tenantId },
      relations: ['widgets'],
    });
  }

  async addWidget(dashboardId: string, tenantId: string, dto: CreateWidgetDto) {
    const dashboard = await this.findOne(dashboardId, tenantId);
    if (!dashboard) throw new Error('Dashboard not found');

    const widget = this.widgetRepo.create({
      dashboardId,
      ...dto,
    });
    return this.widgetRepo.save(widget);
  }

  async getWidgetData(widgetId: string) {
    const widget = await this.widgetRepo.findOne({ where: { id: widgetId } });
    if (!widget) throw new Error('Widget not found');

    // Mock widget data based on type
    return this.generateMockData(widget.widgetType);
  }

  private generateMockData(widgetType: string): any {
    switch (widgetType) {
      case 'metric_card':
        return {
          value: Math.floor(Math.random() * 1000),
          change: Math.floor(Math.random() * 20) - 10,
          trend: 'up',
        };
      case 'line_chart':
        return {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          datasets: [{
            data: Array.from({ length: 5 }, () => Math.floor(Math.random() * 100)),
          }],
        };
      case 'bar_chart':
        return {
          labels: ['Team A', 'Team B', 'Team C'],
          datasets: [{
            data: Array.from({ length: 3 }, () => Math.floor(Math.random() * 50)),
          }],
        };
      case 'table':
        return {
          columns: ['Agent', 'Calls', 'Avg Time'],
          rows: [
            ['Agent 1', 45, '5:30'],
            ['Agent 2', 38, '6:15'],
            ['Agent 3', 52, '4:45'],
          ],
        };
      default:
        return { message: 'No data available' };
    }
  }
}
