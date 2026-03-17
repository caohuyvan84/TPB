import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interaction, InteractionNote } from '../entities';

@Injectable()
export class InteractionService {
  constructor(
    @InjectRepository(Interaction)
    private interactionRepo: Repository<Interaction>,
    @InjectRepository(InteractionNote)
    private noteRepo: Repository<InteractionNote>,
  ) {}

  async listInteractions(filters: any = {}) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.channel) where.channel = filters.channel;
    if (filters.assignedAgentId) where.assignedAgentId = filters.assignedAgentId;
    if (filters.customerId) where.customerId = filters.customerId;

    return this.interactionRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async getInteraction(id: string) {
    const interaction = await this.interactionRepo.findOne({
      where: { id },
    });

    if (!interaction) {
      throw new NotFoundException('Interaction not found');
    }

    return interaction;
  }

  async updateStatus(id: string, status: string) {
    const interaction = await this.getInteraction(id);
    interaction.status = status;
    interaction.updatedAt = new Date();

    if (status === 'closed') {
      interaction.closedAt = new Date();
    }

    return this.interactionRepo.save(interaction);
  }

  async assignAgent(id: string, agentId: string, agentName?: string) {
    const interaction = await this.getInteraction(id);
    interaction.assignedAgentId = agentId;
    interaction.assignedAgentName = agentName;
    interaction.updatedAt = new Date();

    return this.interactionRepo.save(interaction);
  }

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
      interactionId,
      agentId,
      agentName,
      content,
      tag,
      isPinned: isPinned || false,
    });

    return this.noteRepo.save(note);
  }
}
