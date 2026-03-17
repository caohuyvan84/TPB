import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { CreateDashboardDto, CreateWidgetDto } from './dto/dashboard.dto';

@Controller('dashboards')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Post()
  createDashboard(@Body() dto: CreateDashboardDto) {
    const tenantId = 'tenant-1';
    const userId = 'user-1';
    return this.dashboardService.createDashboard(tenantId, userId, dto);
  }

  @Get()
  findAll() {
    const tenantId = 'tenant-1';
    return this.dashboardService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const tenantId = 'tenant-1';
    return this.dashboardService.findOne(id, tenantId);
  }

  @Post(':id/widgets')
  addWidget(@Param('id') id: string, @Body() dto: CreateWidgetDto) {
    const tenantId = 'tenant-1';
    return this.dashboardService.addWidget(id, tenantId, dto);
  }

  @Get('widgets/:widgetId/data')
  getWidgetData(@Param('widgetId') widgetId: string) {
    return this.dashboardService.getWidgetData(widgetId);
  }
}
