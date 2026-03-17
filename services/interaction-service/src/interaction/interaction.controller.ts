import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { InteractionService } from './interaction.service';
import {
  UpdateStatusDto,
  AssignAgentDto,
  CreateNoteDto,
  ListInteractionsDto,
} from './dto/interaction.dto';

@Controller('interactions')
export class InteractionController {
  constructor(private interactionService: InteractionService) {}

  @Get()
  async list(@Query() filters: ListInteractionsDto) {
    return this.interactionService.listInteractions(filters);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.interactionService.getInteraction(id);
  }

  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.interactionService.updateStatus(id, dto.status);
  }

  @Post(':id/assign')
  @Put(':id/assign')
  async assignAgent(@Param('id') id: string, @Body() dto: AssignAgentDto) {
    return this.interactionService.assignAgent(
      id,
      dto.agentId,
      dto.agentName,
    );
  }

  @Get(':id/notes')
  async getNotes(@Param('id') id: string) {
    return this.interactionService.getNotes(id);
  }

  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const agentId = user?.sub || user?.id || '00000000-0000-0000-0000-000000000001';
    const agentName = user?.fullName || user?.username || 'System Administrator';

    return this.interactionService.addNote(
      id,
      agentId,
      agentName,
      dto.content,
      dto.tag,
      dto.isPinned,
    );
  }
}
