import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AgentProfile,
  AgentChannelStatus,
  AgentSession,
  AgentGroup,
  SkillDefinition,
} from '../entities';
import { AgentStateService } from 'nest-redis-state';
import { KafkaProducerService, KafkaTopics } from 'nest-kafka';

@Injectable()
export class AgentService {
  constructor(
    @InjectRepository(AgentProfile)
    private agentProfileRepo: Repository<AgentProfile>,
    @InjectRepository(AgentChannelStatus)
    private channelStatusRepo: Repository<AgentChannelStatus>,
    @InjectRepository(AgentSession)
    private sessionRepo: Repository<AgentSession>,
    @InjectRepository(AgentGroup)
    private groupRepo: Repository<AgentGroup>,
    @InjectRepository(SkillDefinition)
    private skillRepo: Repository<SkillDefinition>,
    private agentState: AgentStateService,
    private kafkaProducer: KafkaProducerService,
  ) {}

  /* ── Profile ─────────────────────────────────────── */

  async getAgentProfile(userId: string, displayName?: string) {
    let profile = await this.agentProfileRepo.findOne({
      where: { userId },
      relations: ['channelStatuses'],
    });

    if (!profile) {
      profile = this.agentProfileRepo.create({
        userId,
        agentId: `AGT-${userId.slice(0, 8).toUpperCase()}`,
        displayName: displayName || 'Agent',
        tenantId: '00000000-0000-0000-0000-000000000000',
        skills: [],
      });
      profile = await this.agentProfileRepo.save(profile);
      profile.channelStatuses = [];

      await this.kafkaProducer.publish(
        KafkaTopics.AGENT_CREATED,
        { agentId: profile.agentId, userId, displayName: profile.displayName },
        'agent-service',
        profile.agentId,
      );
    }

    return profile;
  }

  /* ── Status (Redis hot-state + PostgreSQL persist) ── */

  async getChannelStatuses(agentId: string) {
    // Try Redis first for hot state
    const redisState = await this.agentState.getState(agentId);
    if (redisState) {
      return {
        source: 'redis',
        status: redisState.status,
        voiceCount: redisState.voiceCount,
        voiceMax: redisState.voiceMax,
        chatCount: redisState.chatCount,
        chatMax: redisState.chatMax,
        emailCount: redisState.emailCount,
        emailMax: redisState.emailMax,
        currentInteraction: redisState.currentInteraction,
      };
    }

    // Fallback to PostgreSQL
    const statuses = await this.channelStatusRepo.find({
      where: { agentId },
      order: { channel: 'ASC' },
    });
    return { source: 'postgres', channels: statuses };
  }

  async setChannelStatus(
    agentId: string,
    channel: string,
    status: string,
    reason?: string,
    customReason?: string,
  ) {
    // Persist to PostgreSQL
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

    const saved = await this.channelStatusRepo.save(channelStatus);

    // Update Redis hot-state
    const redisStatus = status === 'ready' ? 'ready' : 'not_ready';
    await this.agentState.setStatus(agentId, redisStatus as any);

    // Publish Kafka event
    await this.kafkaProducer.publish(
      KafkaTopics.AGENT_STATUS_CHANGED,
      { agentId, channel, status, reason },
      'agent-service',
      agentId,
    );

    return saved;
  }

  async setAllChannelsStatus(agentId: string, status: string, reason?: string) {
    const channels = ['voice', 'email', 'chat'];
    const results = [];

    for (const channel of channels) {
      const result = await this.setChannelStatus(agentId, channel, status, reason);
      results.push(result);
    }

    return results;
  }

  /* ── Login / Logout (Redis lifecycle) ────────────── */

  async login(agentId: string, skills: string[], ipAddress?: string) {
    // Create session in PostgreSQL
    const session = this.sessionRepo.create({
      agentId,
      loginAt: new Date(),
      connectionStatus: 'connected',
      ipAddress: ipAddress || '0.0.0.0',
    });
    await this.sessionRepo.save(session);

    // Set online in Redis
    await this.agentState.setAgentOnline(agentId, skills);

    // Publish event
    await this.kafkaProducer.publish(
      KafkaTopics.AGENT_LOGIN,
      { agentId, skills, ipAddress },
      'agent-service',
      agentId,
    );

    return { success: true, sessionId: session.id };
  }

  async logout(agentId: string) {
    // Close active session
    const session = await this.sessionRepo.findOne({
      where: { agentId, logoutAt: null as any },
      order: { loginAt: 'DESC' },
    });

    if (session) {
      session.logoutAt = new Date();
      session.connectionStatus = 'disconnected';
      await this.sessionRepo.save(session);
    }

    // Remove from Redis
    await this.agentState.setAgentOffline(agentId);

    // Publish event
    await this.kafkaProducer.publish(
      KafkaTopics.AGENT_LOGOUT,
      { agentId },
      'agent-service',
      agentId,
    );

    return { success: true };
  }

  /* ── Heartbeat ───────────────────────────────────── */

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

    // Refresh Redis TTL
    await this.agentState.heartbeat(agentId);

    return { success: true, timestamp: new Date() };
  }

  /* ── Query ───────────────────────────────────────── */

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
    // Check Redis first
    const redisState = await this.agentState.getState(agentId);
    if (redisState) {
      return {
        agentId,
        available: redisState.status === 'ready',
        status: redisState.status,
        voiceAvailable: redisState.voiceCount < redisState.voiceMax,
        chatAvailable: redisState.chatCount < redisState.chatMax,
      };
    }

    // Fallback
    const profile = await this.agentProfileRepo.findOne({ where: { agentId } });
    if (!profile) throw new NotFoundException('Agent not found');

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

  /* ── Groups CRUD ─────────────────────────────────── */

  async listGroups() {
    return this.groupRepo.find({ order: { name: 'ASC' } });
  }

  async createGroup(data: {
    name: string;
    description?: string;
    tenantId?: string;
    requiredSkills?: { skill: string; minProficiency: number }[];
  }) {
    const group = this.groupRepo.create({
      name: data.name,
      description: data.description || null,
      tenantId: data.tenantId || '00000000-0000-0000-0000-000000000000',
      requiredSkills: data.requiredSkills || [],
    });
    return this.groupRepo.save(group);
  }

  async getGroup(id: string) {
    const group = await this.groupRepo.findOne({ where: { id } });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async addAgentToGroup(groupId: string, agentId: string) {
    const group = await this.getGroup(groupId);
    if (!group.memberAgentIds.includes(agentId)) {
      group.memberAgentIds = [...group.memberAgentIds, agentId];
      await this.groupRepo.save(group);
    }
    return group;
  }

  /* ── Skills CRUD ─────────────────────────────────── */

  async listSkills() {
    return this.skillRepo.find({ order: { category: 'ASC', name: 'ASC' } });
  }

  async createSkill(data: {
    name: string;
    category: string;
    description?: string;
  }) {
    const skill = this.skillRepo.create({
      name: data.name,
      category: data.category,
      description: data.description || null,
    });
    return this.skillRepo.save(skill);
  }
}
