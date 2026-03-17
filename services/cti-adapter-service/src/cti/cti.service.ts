import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CtiConfig } from '../entities';
import { ICtiAdapter, MockCtiAdapter } from '../adapters/cti-adapter.interface';

@Injectable()
export class CtiService {
  private adapters = new Map<string, ICtiAdapter>();

  constructor(
    @InjectRepository(CtiConfig)
    private configRepo: Repository<CtiConfig>,
  ) {}

  async getAdapter(tenantId: string): Promise<ICtiAdapter> {
    if (this.adapters.has(tenantId)) {
      return this.adapters.get(tenantId)!;
    }

    const config = await this.configRepo.findOne({ where: { tenantId, isActive: true } });
    if (!config) throw new Error('CTI config not found');

    // For MVP, always use mock adapter
    const adapter = new MockCtiAdapter();
    await adapter.connect();
    this.adapters.set(tenantId, adapter);
    return adapter;
  }

  async answerCall(tenantId: string, callId: string) {
    const adapter = await this.getAdapter(tenantId);
    await adapter.answerCall(callId);
    return { success: true };
  }

  async hangupCall(tenantId: string, callId: string) {
    const adapter = await this.getAdapter(tenantId);
    await adapter.hangupCall(callId);
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
    return { success: true };
  }

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
    return this.configRepo.save(config);
  }
}
