import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { InteractionService } from './interaction.service';
import { CallTimelineConsumerService } from './call-timeline-consumer.service';
import {
  UpdateStatusDto,
  AssignAgentDto,
  CreateNoteDto,
  ListInteractionsDto,
} from './dto/interaction.dto';

@Controller('interactions')
export class InteractionController {
  constructor(
    private interactionService: InteractionService,
    private callTimeline: CallTimelineConsumerService,
  ) {}

  @Get()
  async list(@Query() filters: ListInteractionsDto) {
    return this.interactionService.listInteractions(filters);
  }

  @Post()
  async create(@Body() body: {
    type: string;
    channel: string;
    customerId: string;
    customerName?: string;
    direction?: string;
    subject?: string;
    priority?: string;
    callLegId?: string;
    ivrSelections?: string[];
  }) {
    return this.interactionService.createInteraction(body);
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
    return this.interactionService.assignAgent(id, dto.agentId, dto.agentName);
  }

  @Post(':id/transfer')
  async transfer(
    @Param('id') id: string,
    @Body() body: { fromAgentId: string; toAgentId: string; toAgentName?: string; reason?: string },
  ) {
    return this.interactionService.transferInteraction(
      id, body.fromAgentId, body.toAgentId, body.toAgentName, body.reason,
    );
  }

  @Get(':id/timeline')
  async getTimeline(@Param('id') id: string) {
    return this.interactionService.getTimeline(id);
  }

  @Get('call-timeline-by-call/:callId')
  async getCallTimelineByCallId(@Param('callId') callId: string) {
    const events = await this.callTimeline.getByCallId(callId);
    return { callId, events, summary: this.computeSummary(events) };
  }

  @Get(':id/call-timeline')
  async getCallTimeline(@Param('id') id: string) {
    const events = await this.callTimeline.getByInteractionId(id);
    return { interactionId: id, events, summary: this.computeSummary(events) };
  }

  private computeSummary(events: any[]) {
    let totalDurationMs = 0, talkTimeMs = 0, ivrTimeMs = 0, waitTimeMs = 0;
    let holdCount = 0, transferCount = 0, missedAgentCount = 0;
    for (const evt of events) {
      const d = evt.data || {};
      if (evt.eventType === 'ended') {
        totalDurationMs = (d['totalDurationMs'] as number) || 0;
        talkTimeMs = (d['talkTimeMs'] as number) || 0;
      }
      if (evt.eventType === 'ivr_completed') ivrTimeMs = (d['durationMs'] as number) || 0;
      if (evt.eventType === 'answered') waitTimeMs = (d['waitTimeMs'] as number) || 0;
      if (evt.eventType === 'hold') holdCount++;
      if (evt.eventType === 'transfer_initiated') transferCount++;
      if (evt.eventType === 'agent_missed') missedAgentCount++;
    }
    return { totalDurationMs, talkTimeMs, ivrTimeMs, waitTimeMs, holdCount, transferCount, missedAgentCount };
  }

  @Patch(':id/voice')
  async updateVoice(
    @Param('id') id: string,
    @Body() body: { callLegId?: string; recordingUrl?: string; callDuration?: number; ivrSelections?: string[] },
  ) {
    return this.interactionService.updateVoiceFields(id, body);
  }

  @Get(':id/notes')
  async getNotes(@Param('id') id: string) {
    return this.interactionService.getNotes(id);
  }

  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto & { agentId?: string; agentName?: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    // Use JWT user info first, fall back to body fields from frontend
    const agentId = user?.sub || user?.id || dto.agentId || 'unknown';
    const agentName = user?.fullName || user?.username || dto.agentName || 'Agent';
    return this.interactionService.addNote(id, agentId, agentName, dto.content, dto.tag, dto.isPinned);
  }
}
