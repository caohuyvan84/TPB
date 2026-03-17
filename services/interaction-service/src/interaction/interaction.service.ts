import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Interaction, InteractionNote, InteractionEvent } from '../entities';
import { KafkaProducerService, KafkaTopics } from 'nest-kafka';

@Injectable()
export class InteractionService {
  constructor(
    @InjectRepository(Interaction)
    private interactionRepo: Repository<Interaction>,
    @InjectRepository(InteractionNote)
    private noteRepo: Repository<InteractionNote>,
    @InjectRepository(InteractionEvent)
    private eventRepo: Repository<InteractionEvent>,
    private kafkaProducer: KafkaProducerService,
  ) {}

  /* ── Create ──────────────────────────────────────── */

  async createInteraction(data: {
    type: string;
    channel: string;
    customerId: string;
    customerName?: string;
    direction?: string;
    subject?: string;
    priority?: string;
    metadata?: Record<string, any>;
    callLegId?: string;
    ivrSelections?: string[];
  }) {
    const displayId = `INT-${Date.now().toString(36).toUpperCase()}`;

    const interaction = this.interactionRepo.create({
      displayId,
      tenantId: '00000000-0000-0000-0000-000000000000',
      type: data.type as any,
      channel: data.channel as any,
      status: 'new',
      priority: data.priority || 'medium',
      customerId: data.customerId,
      customerName: data.customerName,
      direction: data.direction || 'inbound',
      subject: data.subject,
      metadata: {
        ...data.metadata,
        callLegId: data.callLegId,
        ivrSelections: data.ivrSelections,
      },
    });

    const saved = await this.interactionRepo.save(interaction);

    await this.addEvent(saved.id, 'created', undefined, {
      channel: data.channel,
      direction: data.direction,
    });

    await this.kafkaProducer.publish(
      KafkaTopics.INTERACTION_CREATED,
      { interactionId: saved.id, channel: data.channel, customerId: data.customerId },
      'interaction-service',
      saved.id,
    );

    return saved;
  }

  /* ── List with cursor pagination ─────────────────── */

  async listInteractions(filters: {
    status?: string;
    channel?: string;
    assignedAgentId?: string;
    customerId?: string;
    cursor?: string;
    limit?: number;
  }) {
    const take = filters.limit || 50;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.channel) where.channel = filters.channel;
    if (filters.assignedAgentId) where.assignedAgentId = filters.assignedAgentId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.cursor) where.createdAt = LessThan(new Date(filters.cursor));

    const items = await this.interactionRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: take + 1,
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    const nextCursor = hasMore
      ? data[data.length - 1].createdAt.toISOString()
      : null;

    return { data, nextCursor, hasMore };
  }

  /* ── Get one ─────────────────────────────────────── */

  async getInteraction(id: string) {
    const interaction = await this.interactionRepo.findOne({ where: { id } });
    if (!interaction) throw new NotFoundException('Interaction not found');
    return interaction;
  }

  /* ── Update status ───────────────────────────────── */

  async updateStatus(id: string, status: string) {
    const interaction = await this.getInteraction(id);
    interaction.status = status;
    interaction.updatedAt = new Date();

    if (status === 'closed') {
      interaction.closedAt = new Date();
      await this.kafkaProducer.publish(
        KafkaTopics.INTERACTION_CLOSED,
        { interactionId: id },
        'interaction-service',
        id,
      );
    }

    await this.addEvent(id, 'status_changed', undefined, { status });
    return this.interactionRepo.save(interaction);
  }

  /* ── Assign agent ────────────────────────────────── */

  async assignAgent(id: string, agentId: string, agentName?: string) {
    const interaction = await this.getInteraction(id);
    interaction.assignedAgentId = agentId;
    interaction.assignedAgentName = agentName;
    interaction.status = 'in-progress';
    interaction.updatedAt = new Date();

    const saved = await this.interactionRepo.save(interaction);
    await this.addEvent(id, 'assigned', agentId, { agentName });

    await this.kafkaProducer.publish(
      KafkaTopics.INTERACTION_ASSIGNED,
      { interactionId: id, agentId, agentName },
      'interaction-service',
      id,
    );

    return saved;
  }

  /* ── Transfer ────────────────────────────────────── */

  async transferInteraction(
    id: string,
    fromAgentId: string,
    toAgentId: string,
    toAgentName?: string,
    reason?: string,
  ) {
    const interaction = await this.getInteraction(id);

    const transferHistory = (interaction.metadata['transferHistory'] as any[]) || [];
    transferHistory.push({
      from: fromAgentId,
      to: toAgentId,
      reason,
      timestamp: new Date().toISOString(),
    });
    interaction.metadata = { ...interaction.metadata, transferHistory };
    interaction.assignedAgentId = toAgentId;
    interaction.assignedAgentName = toAgentName;
    interaction.updatedAt = new Date();

    const saved = await this.interactionRepo.save(interaction);
    await this.addEvent(id, 'transferred', toAgentId, { from: fromAgentId, to: toAgentId, reason });

    await this.kafkaProducer.publish(
      KafkaTopics.INTERACTION_TRANSFERRED,
      { interactionId: id, fromAgentId, toAgentId, reason },
      'interaction-service',
      id,
    );

    return saved;
  }

  /* ── Timeline ────────────────────────────────────── */

  async getTimeline(interactionId: string) {
    return this.eventRepo.find({
      where: { interactionId },
      order: { timestamp: 'ASC' },
    });
  }

  /* ── Voice fields ────────────────────────────────── */

  async updateVoiceFields(id: string, data: {
    callLegId?: string;
    recordingUrl?: string;
    callDuration?: number;
    ivrSelections?: string[];
  }) {
    const interaction = await this.getInteraction(id);
    interaction.metadata = { ...interaction.metadata, ...data };
    interaction.updatedAt = new Date();
    return this.interactionRepo.save(interaction);
  }

  /* ── Notes ───────────────────────────────────────── */

  async getNotes(interactionId: string) {
    return this.noteRepo.find({
      where: { interactionId },
      order: { createdAt: 'DESC' },
    });
  }

  async addNote(
    interactionId: string,
    agentId: string,
    agentName: string,
    content: string,
    tag?: string,
    isPinned?: boolean,
  ) {
    const note = this.noteRepo.create({
      interactionId, agentId, agentName, content, tag, isPinned: isPinned || false,
    });
    return this.noteRepo.save(note);
  }

  /* ── Internal ────────────────────────────────────── */

  private async addEvent(interactionId: string, type: string, agentId?: string, data: Record<string, any> = {}) {
    const event = this.eventRepo.create({ interactionId, type, timestamp: new Date(), agentId, data });
    return this.eventRepo.save(event);
  }
}
