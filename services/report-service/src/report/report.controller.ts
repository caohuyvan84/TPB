import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/report.dto';

@Controller('reports')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Post()
  createReport(@Body() dto: CreateReportDto) {
    const tenantId = 'tenant-1';
    const userId = 'user-1';
    return this.reportService.createReport(tenantId, userId, dto);
  }

  @Get()
  findAll() {
    const tenantId = 'tenant-1';
    return this.reportService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    const tenantId = 'tenant-1';
    return this.reportService.findOne(id, tenantId);
  }

  @Post(':id/embed-token')
  generateGuestToken(@Param('id') id: string) {
    const tenantId = 'tenant-1';
    const userId = 'user-1';
    return this.reportService.generateGuestToken(id, tenantId, userId);
  }
}
