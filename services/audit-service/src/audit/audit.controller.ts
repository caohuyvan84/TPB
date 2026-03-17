import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { QueryAuditLogsDto } from './dto/audit.dto';

@Controller('api/v1/audit')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('logs')
  queryLogs(@Query() dto: QueryAuditLogsDto) {
    return this.auditService.query(dto);
  }

  @Get('verify-chain')
  verifyChain(@Query('tenantId') tenantId: string) {
    return this.auditService.verifyChain(tenantId);
  }

  @Post('log')
  createLog(@Body() data: any) {
    return this.auditService.log(data);
  }
}
