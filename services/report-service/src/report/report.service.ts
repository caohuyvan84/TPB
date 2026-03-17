import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportAccessLog } from '../entities';
import { CreateReportDto } from './dto/report.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report)
    private reportRepo: Repository<Report>,
    @InjectRepository(ReportAccessLog)
    private accessLogRepo: Repository<ReportAccessLog>,
  ) {}

  async createReport(tenantId: string, userId: string, dto: CreateReportDto) {
    const report = this.reportRepo.create({
      tenantId,
      createdBy: userId,
      ...dto,
    });
    return this.reportRepo.save(report);
  }

  async findAll(tenantId: string) {
    return this.reportRepo.find({ where: { tenantId, isActive: true } });
  }

  async findOne(id: string, tenantId: string) {
    return this.reportRepo.findOne({ where: { id, tenantId } });
  }

  async generateGuestToken(reportId: string, tenantId: string, userId: string) {
    const report = await this.findOne(reportId, tenantId);
    if (!report) throw new Error('Report not found');

    // Log access
    const accessLog = this.accessLogRepo.create({
      reportId,
      userId,
    });
    await this.accessLogRepo.save(accessLog);

    // Mock Superset guest token generation
    const token = this.generateMockToken(userId, report);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    return {
      token,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private generateMockToken(userId: string, report: Report): string {
    // Mock token generation (in production, call Superset API)
    const payload = {
      user: userId,
      resources: [{
        type: report.supersetDashboardId ? 'dashboard' : 'chart',
        id: report.supersetDashboardId || report.supersetChartId,
      }],
      rls: [{ clause: `tenant_id = '${report.tenantId}'` }],
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
}
