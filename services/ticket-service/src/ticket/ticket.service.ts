import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketComment, TicketHistory } from '../entities';

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);

  constructor(
    @InjectRepository(Ticket) private ticketRepo: Repository<Ticket>,
    @InjectRepository(TicketComment) private commentRepo: Repository<TicketComment>,
    @InjectRepository(TicketHistory) private historyRepo: Repository<TicketHistory>,
  ) {}

  async listTickets(filters?: any) {
    const query = this.ticketRepo.createQueryBuilder('ticket');

    if (filters?.status) {
      query.andWhere('ticket.status = :status', { status: filters.status });
    }
    if (filters?.assignedAgentId) {
      query.andWhere('ticket.assigned_agent_id = :agentId', {
        agentId: filters.assignedAgentId,
      });
    }
    if (filters?.customerId) {
      query.andWhere('ticket.customer_id = :customerId', {
        customerId: filters.customerId,
      });
    }

    return query.orderBy('ticket.created_at', 'DESC').limit(50).getMany();
  }

  async getTicket(id: string) {
    const ticket = await this.ticketRepo.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async createTicket(data: Partial<Ticket>) {
    if (!data.title) {
      throw new BadRequestException('Title is required');
    }
    if (!data.customerId) {
      throw new BadRequestException('CustomerId is required');
    }

    try {
      const displayId = `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const tenantId = data.tenantId || '00000000-0000-0000-0000-000000000000';

      const ticket = this.ticketRepo.create();
      ticket.displayId = displayId;
      ticket.tenantId = tenantId;
      ticket.title = data.title;
      ticket.description = data.description ?? undefined;
      ticket.status = data.status || 'open';
      ticket.priority = data.priority || 'medium';
      ticket.category = data.category ?? undefined;
      ticket.department = data.department ?? undefined;
      ticket.customerId = data.customerId;
      ticket.assignedAgentId = data.assignedAgentId ?? undefined;
      ticket.interactionId = data.interactionId ?? undefined;
      ticket.dynamicFields = data.dynamicFields || {};

      return await this.ticketRepo.save(ticket);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error creating ticket: ${msg}`);
      throw new BadRequestException(`Failed to create ticket: ${msg}`);
    }
  }

  async updateTicket(id: string, data: Partial<Ticket>) {
    const ticket = await this.getTicket(id);

    if (data.title !== undefined) ticket.title = data.title;
    if (data.description !== undefined) ticket.description = data.description;
    if (data.status !== undefined) ticket.status = data.status;
    if (data.priority !== undefined) ticket.priority = data.priority;
    if (data.category !== undefined) ticket.category = data.category;
    if (data.department !== undefined) ticket.department = data.department;
    if (data.assignedAgentId !== undefined) ticket.assignedAgentId = data.assignedAgentId;
    if (data.interactionId !== undefined) ticket.interactionId = data.interactionId;
    if (data.dynamicFields !== undefined) ticket.dynamicFields = data.dynamicFields;

    try {
      return await this.ticketRepo.save(ticket);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error updating ticket ${id}: ${msg}`);
      throw new BadRequestException(`Failed to update ticket: ${msg}`);
    }
  }

  async addComment(ticketId: string, agentId: string, agentName: string, content: string, isInternal = false) {
    await this.getTicket(ticketId);

    try {
      const comment = this.commentRepo.create({ ticketId, agentId, agentName, content, isInternal });
      return await this.commentRepo.save(comment);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error adding comment to ticket ${ticketId}: ${msg}`);
      throw new BadRequestException(`Failed to add comment: ${msg}`);
    }
  }

  async getComments(ticketId: string) {
    return this.commentRepo.find({
      where: { ticketId },
      order: { createdAt: 'DESC' },
    });
  }

  async getHistory(ticketId: string) {
    return this.historyRepo.find({
      where: { ticketId },
      order: { changedAt: 'DESC' },
    });
  }
}
