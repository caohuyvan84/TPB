import { Controller, Post, Get, Patch, Delete, Body, Query, Param } from '@nestjs/common';
import { CtiService } from './cti.service';
import { PushService } from './push.service';

@Controller()
export class CtiController {
  constructor(
    private readonly ctiService: CtiService,
    private readonly pushService: PushService,
  ) {}

  @Post('cti/calls/answer')
  async answerCall(@Query('tenantId') tenantId: string, @Body() body: { callId: string }) {
    return this.ctiService.answerCall(tenantId, body.callId);
  }

  @Post('cti/calls/hangup')
  async hangupCall(@Query('tenantId') tenantId: string, @Body() body: { callId?: string; agentId?: string }) {
    return this.ctiService.hangupCall(tenantId, body.agentId || body.callId || '');
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

  @Post('cti/agent/sip-heartbeat')
  async sipHeartbeat(
    @Query('tenantId') tenantId: string,
    @Body() body: { agentId: string; sipRegistered: boolean; timestamp: number },
  ) {
    return this.ctiService.sipHeartbeat(tenantId, body.agentId, body.sipRegistered);
  }

  @Get('admin/cti/config')
  async getConfig(@Query('tenantId') tenantId: string) {
    return this.ctiService.getConfig(tenantId);
  }

  @Patch('admin/cti/config')
  async updateConfig(@Query('tenantId') tenantId: string, @Body() data: any) {
    return this.ctiService.updateConfig(tenantId, data);
  }

  // ── Web Push Subscription ──────────────────────────

  @Post('cti/push-subscription')
  async savePushSubscription(@Body() body: { agentId: string; subscription: any }) {
    await this.pushService.saveSubscription(body.agentId, body.subscription);
    return { status: 'ok' };
  }

  @Delete('cti/push-subscription')
  async removePushSubscription(@Query('agentId') agentId: string) {
    await this.pushService.removeSubscription(agentId);
    return { status: 'ok' };
  }

  @Post('cti/agent-tab-status')
  async reportTabStatus(@Body() body: { agentId: string; tabVisible: boolean; audioActive: boolean; sipRegistered: boolean }) {
    await this.pushService.saveTabStatus(body.agentId, body);
    return { status: 'ok' };
  }
}
