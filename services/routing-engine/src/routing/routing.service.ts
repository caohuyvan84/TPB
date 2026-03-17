import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoutingQueue, RoutingRule } from '../entities';
import { AgentStateService, AgentState } from 'nest-redis-state';
import { KafkaProducerService, KafkaTopics } from 'nest-kafka';
import { RedisClientService } from 'nest-redis-state';

const QUEUE_KEY_PREFIX = 'routing:queue:';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private slaInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(RoutingQueue)
    private queueRepo: Repository<RoutingQueue>,
    @InjectRepository(RoutingRule)
    private ruleRepo: Repository<RoutingRule>,
    private agentState: AgentStateService,
    private redis: RedisClientService,
    private kafkaProducer: KafkaProducerService,
  ) {}

  /* ── Queue CRUD ──────────────────────────────────── */

  async listQueues() {
    return this.queueRepo.find({ order: { priority: 'DESC', name: 'ASC' } });
  }

  async createQueue(data: Partial<RoutingQueue>) {
    const queue = this.queueRepo.create(data);
    return this.queueRepo.save(queue);
  }

  async getQueue(id: string) {
    return this.queueRepo.findOne({ where: { id } });
  }

  /* ── Rule CRUD ───────────────────────────────────── */

  async listRules() {
    return this.ruleRepo.find({ order: { priority: 'DESC' } });
  }

  async createRule(data: Partial<RoutingRule>) {
    const rule = this.ruleRepo.create(data);
    return this.ruleRepo.save(rule);
  }

  /* ── Routing: find queue for inbound ─────────────── */

  async resolveQueue(channelType: string, metadata: Record<string, any> = {}): Promise<RoutingQueue | null> {
    const rules = await this.ruleRepo.find({
      where: { enabled: true },
      order: { priority: 'DESC' },
    });

    for (const rule of rules) {
      const conds = rule.conditions as Record<string, any>;
      let match = true;

      if (conds['channelType'] && conds['channelType'] !== channelType) match = false;
      if (conds['ivrSelection'] && conds['ivrSelection'] !== metadata['ivrSelection']) match = false;

      if (match) {
        return this.queueRepo.findOne({ where: { id: rule.targetQueueId } });
      }
    }

    // Fallback: first enabled queue for this channel
    return this.queueRepo.findOne({
      where: { channelType, enabled: true },
      order: { priority: 'DESC' },
    });
  }

  /* ── Enqueue interaction ─────────────────────────── */

  async enqueue(queueId: string, interactionId: string, priority: number = 0) {
    const score = Date.now() - priority * 100000; // Lower score = higher priority
    await this.redis.client.zadd(`${QUEUE_KEY_PREFIX}${queueId}`, score, interactionId);
    this.logger.log(`Enqueued ${interactionId} in queue ${queueId} (score: ${score})`);
  }

  /* ── Dequeue + assign to best agent ──────────────── */

  async dequeueAndAssign(queueId: string): Promise<{ interactionId: string; agentId: string } | null> {
    const queue = await this.queueRepo.findOne({ where: { id: queueId } });
    if (!queue) return null;

    // Get next interaction from queue
    const items = await this.redis.client.zrange(`${QUEUE_KEY_PREFIX}${queueId}`, 0, 0);
    if (items.length === 0) return null;

    const interactionId = items[0];

    // Score and select best agent
    const availableAgents = await this.agentState.getAvailableAgents(queue.channelType);
    if (availableAgents.length === 0) return null;

    const scored = await this.scoreAgents(availableAgents, queue);
    if (scored.length === 0) return null;

    // Try to claim the top-scoring agent
    for (const { agentId } of scored) {
      const claimed = await this.agentState.claimAgent(agentId, interactionId, queue.channelType);
      if (claimed) {
        // Remove from queue
        await this.redis.client.zrem(`${QUEUE_KEY_PREFIX}${queueId}`, interactionId);

        // Publish assignment event
        await this.kafkaProducer.publish(
          KafkaTopics.INTERACTION_ASSIGNED,
          { interactionId, agentId, queueId },
          'routing-engine',
          interactionId,
        );

        this.logger.log(`Assigned ${interactionId} to agent ${agentId}`);
        return { interactionId, agentId };
      }
    }

    return null;
  }

  /* ── Agent scoring (5 factors) ───────────────────── */

  private async scoreAgents(
    agentIds: string[],
    queue: RoutingQueue,
  ): Promise<{ agentId: string; score: number }[]> {
    const scored: { agentId: string; score: number }[] = [];

    for (const agentId of agentIds) {
      const state = await this.agentState.getState(agentId);
      if (!state || state.status !== 'ready') continue;

      let score = 0;

      // Factor 1: Skill match (0-40 points)
      const agentSkills: string[] = JSON.parse(state.skills || '[]');
      const requiredSkills = queue.requiredSkills || [];
      if (requiredSkills.length > 0) {
        const matched = requiredSkills.filter((s) => agentSkills.includes(s));
        score += (matched.length / requiredSkills.length) * 40;
      } else {
        score += 40; // No skill requirement = full score
      }

      // Factor 2: Capacity utilization (0-20 points) — prefer less loaded
      const channelKey = queue.channelType as 'voice' | 'chat' | 'email';
      const count = channelKey === 'voice' ? state.voiceCount
        : channelKey === 'chat' ? state.chatCount
        : state.emailCount;
      const max = channelKey === 'voice' ? state.voiceMax
        : channelKey === 'chat' ? state.chatMax
        : state.emailMax;
      if (max > 0) {
        score += ((max - count) / max) * 20;
      }

      // Factor 3: Idle time (0-20 points) — prefer longest idle
      const idleMs = Date.now() - parseInt(state.statusChangedAt || '0', 10);
      score += Math.min(idleMs / 60000, 1) * 20; // Max at 1 minute idle

      // Factor 4: No current interaction bonus (10 points)
      if (!state.currentInteraction) {
        score += 10;
      }

      // Factor 5: Random tiebreaker (0-10 points)
      score += Math.random() * 10;

      scored.push({ agentId, score });
    }

    return scored.sort((a, b) => b.score - a.score);
  }

  /* ── SLA enforcement (called on interval) ────────── */

  startSlaEnforcement() {
    if (this.slaInterval) return;

    this.slaInterval = setInterval(async () => {
      try {
        await this.checkSla();
      } catch (err) {
        this.logger.error(`SLA check failed: ${err}`);
      }
    }, 5000); // Every 5 seconds

    this.logger.log('SLA enforcement started (5s interval)');
  }

  stopSlaEnforcement() {
    if (this.slaInterval) {
      clearInterval(this.slaInterval);
      this.slaInterval = null;
    }
  }

  private async checkSla() {
    const queues = await this.queueRepo.find({ where: { enabled: true } });

    for (const queue of queues) {
      const queueKey = `${QUEUE_KEY_PREFIX}${queue.id}`;
      const items = await this.redis.client.zrange(queueKey, 0, -1, 'WITHSCORES');

      for (let i = 0; i < items.length; i += 2) {
        const interactionId = items[i];
        const enqueueTime = parseInt(items[i + 1], 10);
        const waitMs = Date.now() - enqueueTime;
        const slaMs = queue.slaSeconds * 1000;

        if (waitMs > slaMs) {
          this.logger.warn(
            `SLA BREACH: interaction ${interactionId} in queue ${queue.name} — waited ${Math.round(waitMs / 1000)}s (SLA: ${queue.slaSeconds}s)`,
          );

          // Try overflow queue
          if (queue.overflowQueueId) {
            await this.redis.client.zrem(queueKey, interactionId);
            await this.enqueue(queue.overflowQueueId, interactionId, 10); // High priority
            this.logger.log(`Overflowed ${interactionId} to queue ${queue.overflowQueueId}`);
          }
        } else if (waitMs > slaMs * 0.8) {
          this.logger.warn(
            `SLA WARNING (80%): interaction ${interactionId} in queue ${queue.name} — ${Math.round(waitMs / 1000)}s / ${queue.slaSeconds}s`,
          );
        }
      }
    }
  }
}
