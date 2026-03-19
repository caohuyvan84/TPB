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

  @Post('cti/calls/make')
  async makeCall(
    @Query('tenantId') tenantId: string,
    @Body() body: { agentId: string; destination: string },
  ) {
    return this.ctiService.makeCall(tenantId, body.agentId, body.destination);
  }

  @Get('cti/webrtc/credentials')
  async getWebRTCCredentials(
    @Query('tenantId') tenantId: string,
    @Query('agentId') agentId: string,
  ) {
    return this.ctiService.getWebRTCCredentials(tenantId, agentId);
  }

  @Post('cti/agent/state')
  async setAgentState(
    @Query('tenantId') tenantId: string,
    @Body() body: { agentId: string; status: string },
  ) {
    return this.ctiService.setAgentState(tenantId, body.agentId, body.status);
  }

  @Get('cti/agent/state')
  async getAgentState(
    @Query('tenantId') tenantId: string,
    @Query('agentId') agentId: string,
  ) {
    return this.ctiService.getAgentState(tenantId, agentId);
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
