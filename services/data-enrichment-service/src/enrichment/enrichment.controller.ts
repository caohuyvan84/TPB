import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EnrichmentService } from './enrichment.service';
import { CreateEnrichmentSourceDto, RequestEnrichmentDto } from './dto/enrichment.dto';

@Controller('enrichment')
export class EnrichmentController {
  constructor(private enrichmentService: EnrichmentService) {}

  @Post('sources')
  createSource(@Body() dto: CreateEnrichmentSourceDto) {
    const tenantId = 'tenant-1';
    return this.enrichmentService.createSource(tenantId, dto);
  }

  @Get('sources')
  findAllSources() {
    const tenantId = 'tenant-1';
    return this.enrichmentService.findAllSources(tenantId);
  }

  @Post('request')
  requestEnrichment(@Body() dto: RequestEnrichmentDto) {
    const tenantId = 'tenant-1';
    return this.enrichmentService.requestEnrichment(tenantId, dto);
  }

  @Get('status/:requestId')
  getRequestStatus(@Param('requestId') requestId: string) {
    const tenantId = 'tenant-1';
    return this.enrichmentService.getRequestStatus(requestId, tenantId);
  }
}
