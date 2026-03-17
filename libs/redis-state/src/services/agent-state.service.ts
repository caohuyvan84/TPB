import { Injectable, Logger } from '@nestjs/common';
import { RedisClientService } from './redis-client.service';
import * as fs from 'fs';
import * as path from 'path';

export type AgentStatus =
  | 'offline'
  | 'ready'
  | 'not_ready'
  | 'ringing'
  | 'on_call'
  | 'acw';

export interface AgentState {
  agentId: string;
  status: AgentStatus;
  statusChangedAt: string;
  skills: string; // JSON array
  voiceCount: number;
  voiceMax: number;
  chatCount: number;
  chatMax: number;
  emailCount: number;
  emailMax: number;
  currentInteraction: string | null;
}

const AGENT_HASH_PREFIX = 'agent:state:';
const AVAILABLE_SET_PREFIX = 'agent:available:';
const AGENT_STATE_TTL = 3600; // 1 hour — refreshed by heartbeat

@Injectable()
export class AgentStateService {
  private readonly logger = new Logger(AgentStateService.name);
  private claimScript: string;
  private releaseScript: string;

  constructor(private redis: RedisClientService) {
    const luaDir = path.join(__dirname, '..', 'lua');
    this.claimScript = fs.readFileSync(
      path.join(luaDir, 'agent-claim.lua'),
      'utf-8',
    );
    this.releaseScript = fs.readFileSync(
      path.join(luaDir, 'agent-release.lua'),
      'utf-8',
    );
  }

  /** Create or update agent state hash on login. */
  async setAgentOnline(
    agentId: string,
    skills: string[],
    capacity: { voiceMax?: number; chatMax?: number; emailMax?: number } = {},
  ): Promise<void> {
    const key = `${AGENT_HASH_PREFIX}${agentId}`;
    await this.redis.hmset(key, {
      agentId,
      status: 'ready',
      status_changed_at: Date.now().toString(),
      skills: JSON.stringify(skills),
      voice_count: '0',
      voice_max: (capacity.voiceMax ?? 1).toString(),
      chat_count: '0',
      chat_max: (capacity.chatMax ?? 3).toString(),
      email_count: '0',
      email_max: (capacity.emailMax ?? 5).toString(),
      current_interaction: '',
    });
    await this.redis.expire(key, AGENT_STATE_TTL);
    await this.redis.sadd(`${AVAILABLE_SET_PREFIX}voice`, agentId);
    await this.redis.sadd(`${AVAILABLE_SET_PREFIX}chat`, agentId);
    await this.redis.sadd(`${AVAILABLE_SET_PREFIX}email`, agentId);
    this.logger.debug(`Agent ${agentId} set online (ready)`);
  }

  /** Remove agent state hash on logout. */
  async setAgentOffline(agentId: string): Promise<void> {
    const key = `${AGENT_HASH_PREFIX}${agentId}`;
    await this.redis.del(key);
    await this.redis.srem(`${AVAILABLE_SET_PREFIX}voice`, agentId);
    await this.redis.srem(`${AVAILABLE_SET_PREFIX}chat`, agentId);
    await this.redis.srem(`${AVAILABLE_SET_PREFIX}email`, agentId);
    this.logger.debug(`Agent ${agentId} set offline`);
  }

  /** Update agent status (ready, not_ready, acw). */
  async setStatus(agentId: string, status: AgentStatus): Promise<void> {
    const key = `${AGENT_HASH_PREFIX}${agentId}`;
    await this.redis.hset(key, 'status', status);
    await this.redis.hset(key, 'status_changed_at', Date.now().toString());

    if (status === 'ready') {
      await this.redis.sadd(`${AVAILABLE_SET_PREFIX}voice`, agentId);
    } else {
      await this.redis.srem(`${AVAILABLE_SET_PREFIX}voice`, agentId);
    }
  }

  /** Get agent state from Redis. */
  async getState(agentId: string): Promise<AgentState | null> {
    const raw = await this.redis.hgetall(`${AGENT_HASH_PREFIX}${agentId}`);
    if (!raw || !raw['agentId']) return null;

    return {
      agentId: raw['agentId'],
      status: raw['status'] as AgentStatus,
      statusChangedAt: raw['status_changed_at'],
      skills: raw['skills'],
      voiceCount: parseInt(raw['voice_count'] || '0', 10),
      voiceMax: parseInt(raw['voice_max'] || '1', 10),
      chatCount: parseInt(raw['chat_count'] || '0', 10),
      chatMax: parseInt(raw['chat_max'] || '3', 10),
      emailCount: parseInt(raw['email_count'] || '0', 10),
      emailMax: parseInt(raw['email_max'] || '5', 10),
      currentInteraction: raw['current_interaction'] || null,
    };
  }

  /** Refresh TTL on heartbeat. */
  async heartbeat(agentId: string): Promise<void> {
    await this.redis.expire(`${AGENT_HASH_PREFIX}${agentId}`, AGENT_STATE_TTL);
  }

  /** Atomically claim an agent for a call (Lua script). */
  async claimAgent(
    agentId: string,
    interactionId: string,
    channel: string = 'voice',
  ): Promise<boolean> {
    const result = await this.redis.client.eval(
      this.claimScript,
      2,
      `${AGENT_HASH_PREFIX}${agentId}`,
      `${AVAILABLE_SET_PREFIX}${channel}`,
      agentId,
      'ringing',
      interactionId,
      channel,
    );
    return result === 1;
  }

  /** Atomically release an agent after a call (Lua script). */
  async releaseAgent(
    agentId: string,
    newStatus: AgentStatus = 'ready',
    channel: string = 'voice',
  ): Promise<boolean> {
    const result = await this.redis.client.eval(
      this.releaseScript,
      2,
      `${AGENT_HASH_PREFIX}${agentId}`,
      `${AVAILABLE_SET_PREFIX}${channel}`,
      agentId,
      newStatus,
      channel,
    );
    return result === 1;
  }

  /** Get all available agent IDs for a given channel. */
  async getAvailableAgents(channel: string = 'voice'): Promise<string[]> {
    return this.redis.smembers(`${AVAILABLE_SET_PREFIX}${channel}`);
  }
}
