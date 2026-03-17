import { Controller, Get, Post, Patch, Body, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@Controller('tickets')
export class TicketController {
  constructor(private ticketService: TicketService) {}

  @Get()
  async list(@Query() filters: any) {
    return this.ticketService.listTickets(filters);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.ticketService.getTicket(id);
  }

  @Post()
  async create(@Body() dto: CreateTicketDto) {
    return this.ticketService.createTicket(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.ticketService.updateTicket(id, dto);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.ticketService.getComments(id);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @Body() body: { content: string; isInternal?: boolean },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const agentId = user?.sub || user?.id || '00000000-0000-0000-0000-000000000001';
    const agentName = user?.fullName || user?.username || 'Unknown Agent';

    return this.ticketService.addComment(
      id,
      agentId,
      agentName,
      body.content,
      body.isInternal,
    );
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.ticketService.getHistory(id);
  }
}
