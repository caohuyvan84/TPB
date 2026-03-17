import { Controller, Post, Get, Patch, Body, Query, Param } from '@nestjs/common';
import { CtiService } from './cti.service';

@Controller()
export class CtiController {
  constructor(private readonly ctiService: CtiService) {}

  @Post('cti/calls/answer')
  async answerCall(@Query('tenantId') tenantId: string, @Body() body: { callId: string }) {
    return this.ctiService.answerCall(tenantId, body.callId);
  }

  @Post('cti/calls/hangup')
  async hangupCall(@Query('tenantId') tenantId: string, @Body() body: { callId: string }) {
    return this.ctiService.hangupCall(tenantId, body.callId);
  }

  @Post('cti/calls/hold')
  async holdCall(@Query('tenantId') tenantId: string, @Body() body: { callId: string }) {
    return this.ctiService.holdCall(tenantId, body.callId);
  }

  @Post('cti/calls/transfer')
  async transferCall(
    @Query('tenantId') tenantId: string,
    @Body() body: { callId: string; destination: string },
  ) {
    return this.ctiService.transferCall(tenantId, body.callId, body.destination);
  }

  @Get('admin/cti/config')
  async getConfig(@Query('tenantId') tenantId: string) {
    return this.ctiService.getConfig(tenantId);
  }

  @Patch('admin/cti/config')
  async updateConfig(@Query('tenantId') tenantId: string, @Body() data: any) {
    return this.ctiService.updateConfig(tenantId, data);
  }
}
