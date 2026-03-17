import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentProfile, AgentChannelStatus, AgentSession } from '../entities';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(AgentProfile)
    private agentProfileRepo: Repository<AgentProfile>,
    @InjectRepository(AgentChannelStatus)
    private channelStatusRepo: Repository<AgentChannelStatus>,
    @InjectRepository(AgentSession)
    private sessionRepo: Repository<AgentSession>,
  ) {}

  async getAgentProfile(userId: string, displayName?: string) {
    let profile = await this.agentProfileRepo.findOne({
      where: { userId },
      relations: ['channelStatuses'],
    });

    if (!profile) {
      // Auto-create profile on first access
      profile = this.agentProfileRepo.create({
        userId,
        agentId: `AGT-${userId.slice(0, 8).toUpperCase()}`,
        displayName: displayName || 'Agent',
        tenantId: '00000000-0000-0000-0000-000000000000',
        skills: [],
      });
      profile = await this.agentProfileRepo.save(profile);
      profile.channelStatuses = [];
    }

    return profile;
  }

  async getChannelStatuses(agentId: string) {
    return this.channelStatusRepo.find({
      where: { agentId },
      order: { channel: 'ASC' },
    });
  }

  async setChannelStatus(
    agentId: string,
    channel: string,
    status: string,
    reason?: string,
    customReason?: string,
  ) {
    let channelStatus = await this.channelStatusRepo.findOne({
      where: { agentId, channel: channel as any },
    });

    if (!channelStatus) {
      channelStatus = this.channelStatusRepo.create({
        agentId,
        channel: channel as any,
        status: status as any,
        reason,
        customReason,
      });
    } else {
      channelStatus.status = status as any;
      channelStatus.reason = reason;
      channelStatus.customReason = customReason;
      channelStatus.changedAt = new Date();
    }

    return this.channelStatusRepo.save(channelStatus);
  }

  async setAllChannelsStatus(
    agentId: string,
    status: string,
    reason?: string,
  ) {
    const channels = ['voice', 'email', 'chat'];
    const results = [];

    for (const channel of channels) {
      const result = await this.setChannelStatus(
        agentId,
        channel,
        status,
        reason,
      );
      results.push(result);
    }

    return results;
  }

  async heartbeat(agentId: string, ipAddress?: string) {
    const session = await this.sessionRepo.findOne({
      where: { agentId, logoutAt: null as any },
      order: { loginAt: 'DESC' },
    });

    if (session) {
      session.lastHeartbeatAt = new Date();
      session.connectionStatus = 'connected';
      await this.sessionRepo.save(session);
    }

    return { success: true, timestamp: new Date() };
  }

  async listAgents() {
    return this.agentProfileRepo.find({
      select: ['id', 'agentId', 'displayName', 'department', 'team'],
      order: { displayName: 'ASC' },
    });
  }

  async getAgentById(agentId: string) {
    const profile = await this.agentProfileRepo.findOne({
      where: { agentId },
      relations: ['channelStatuses'],
    });

    if (!profile) {
      throw new NotFoundException('Agent not found');
    }

    return profile;
  }

  async checkAvailability(agentId: string) {
    const profile = await this.agentProfileRepo.findOne({
      where: { agentId },
    });

    if (!profile) {
      throw new NotFoundException('Agent not found');
    }

    const statuses = await this.channelStatusRepo.find({
      where: { agentId: profile.id },
    });

    const available = statuses.filter((s) => s.status === 'ready');

    return {
      agentId,
      available: available.length > 0,
      channels: statuses.map((s) => ({
        channel: s.channel,
        status: s.status,
        available: s.status === 'ready',
      })),
    };
  }
}
