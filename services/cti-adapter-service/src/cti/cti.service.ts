import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CtiConfig } from '../entities';
import { ICtiAdapter } from '../adapters/cti-adapter.interface';
import { FreeSwitchAdapter } from '../adapters/freeswitch-adapter';
import { CtiEventsGateway } from './cti-events.gateway';

@Injectable()
export class CtiService {
  private readonly logger = new Logger(CtiService.name);
  private adapters = new Map<string, FreeSwitchAdapter>();

  constructor(
    @InjectRepository(CtiConfig)
    private configRepo: Repository<CtiConfig>,
    private ctiEvents: CtiEventsGateway,
  ) {}

  async getAdapter(tenantId: string): Promise<FreeSwitchAdapter> {
    if (this.adapters.has(tenantId)) {
      return this.adapters.get(tenantId)!;
    }

    const config = await this.configRepo.findOne({ where: { tenantId, isActive: true } });
    const goacdUrl = (config?.config as any)?.goacdUrl || process.env['GOACD_URL'] || 'http://localhost:9091';

    const adapter = new FreeSwitchAdapter({ goacdUrl });
    await adapter.connect();
    this.adapters.set(tenantId, adapter);
    this.logger.log(`FreeSwitchAdapter created for tenant ${tenantId} → ${goacdUrl}`);
    return adapter;
  }

  /* ── Call control ────────────────────────────────── */

  async answerCall(tenantId: string, callId: string) {
    const adapter = await this.getAdapter(tenantId);
    await adapter.answerCall(callId);
    this.ctiEvents.broadcastCallEvent('call:answered', { callId, tenantId });
    return { success: true };
  }

  async hangupCall(tenantId: string, callId: string) {
    const adapter = await this.getAdapter(tenantId);
    await adapter.hangupCall(callId);
    // Don't broadcast call:ended here — GoACD will publish via Kafka when call actually ends
    return { success: true };
  }

  async holdCall(tenantId: string, callId: string) {
    const adapter = await this.getAdapter(tenantId);
    await adapter.holdCall(callId);
    return { success: true };
  }

  async transferCall(tenantId: string, callId: string, destination: string) {
    const adapter = await this.getAdapter(tenantId);
    await adapter.transferCall(callId, destination);
    this.ctiEvents.broadcastCallEvent('call:transferred', { callId, destination, tenantId });
    return { success: true };
  }

  async makeCall(tenantId: string, agentId: string, destination: string) {
    const adapter = await this.getAdapter(tenantId);
    const result = await adapter.makeCall(agentId, destination);
    this.ctiEvents.broadcastCallEvent('call:outgoing', { agentId, destination, tenantId });
    return result;
  }

  /* ── Agent state via GoACD ───────────────────────── */

  async setAgentState(tenantId: string, agentId: string, status: string) {
    const adapter = await this.getAdapter(tenantId);
    return adapter.setAgentState(agentId, status);
  }

  async getAgentState(tenantId: string, agentId: string) {
    const adapter = await this.getAdapter(tenantId);
    return adapter.getAgentState(agentId);
  }

  async sipHeartbeat(tenantId: string, agentId: string, sipRegistered: boolean) {
    const adapter = await this.getAdapter(tenantId);
    return adapter.sipHeartbeat(agentId, sipRegistered);
  }

  /* ── WebRTC credentials ──────────────────────────── */

  async getWebRTCCredentials(tenantId: string, agentId: string) {
    const adapter = await this.getAdapter(tenantId);
    return adapter.getSIPCredentials(agentId);
  }

  /* ── Config ──────────────────────────────────────── */

  async getConfig(tenantId: string) {
    return this.configRepo.findOne({ where: { tenantId } });
  }

  async updateConfig(tenantId: string, data: any) {
    let config = await this.configRepo.findOne({ where: { tenantId } });
    if (!config) {
      config = this.configRepo.create({ tenantId, vendor: data.vendor, config: data.config });
    } else {
      config.vendor = data.vendor;
      config.config = data.config;
    }
    // Invalidate cached adapter
    this.adapters.delete(tenantId);
    return this.configRepo.save(config);
  }

  /* ── Broadcast incoming call event (called by Kafka consumer) ── */

  broadcastIncomingCall(data: Record<string, unknown>) {
    this.ctiEvents.broadcastCallEvent('call:incoming', data);
  }

  broadcastCallEnded(data: Record<string, unknown>) {
    this.ctiEvents.broadcastCallEvent('call:ended', data);
  }
}
