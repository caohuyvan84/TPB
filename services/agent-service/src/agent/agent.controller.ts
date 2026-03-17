import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { AgentService } from './agent.service';
import { SetChannelStatusDto, SetAllChannelsStatusDto } from './dto/agent.dto';

@Controller('agents')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Get('me')
  async getMe(@Req() req: Request) {
    const user = (req as any).user;
    const userId = user?.sub || user?.id || '00000000-0000-0000-0000-000000000001';
    const displayName = user?.fullName || user?.username || 'Agent';
    return this.agentService.getAgentProfile(userId, displayName);
  }

  @Get('me/status')
  async getStatus(@Req() req: Request) {
    const profile = await this.getMe(req);
    return this.agentService.getChannelStatuses(profile.id);
  }

  @Put('me/status/all')
  async setAllChannelsStatus(
    @Req() req: Request,
    @Body() dto: SetAllChannelsStatusDto,
  ) {
    const profile = await this.getMe(req);
    return this.agentService.setAllChannelsStatus(
      profile.id,
      dto.status,
      dto.reason,
    );
  }

  @Put('me/status/:channel')
  async setChannelStatus(
    @Req() req: Request,
    @Param('channel') channel: string,
    @Body() dto: SetChannelStatusDto,
  ) {
    const profile = await this.getMe(req);
    return this.agentService.setChannelStatus(
      profile.id,
      channel,
      dto.status,
      dto.reason,
      dto.customReason,
    );
  }

  @Post('me/heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@Req() req: Request) {
    const profile = await this.getMe(req);
    const ip = req.ip || 'unknown';
    return this.agentService.heartbeat(profile.id, ip);
  }

  @Get()
  async listAgents() {
    return this.agentService.listAgents();
  }

  @Get(':agentId')
  async getAgent(@Param('agentId') agentId: string) {
    return this.agentService.getAgentById(agentId);
  }

  @Get(':agentId/availability')
  async checkAvailability(@Param('agentId') agentId: string) {
    return this.agentService.checkAvailability(agentId);
  }

  /* ── Login / Logout ──────────────────────────────── */

  @Post('me/login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request) {
    const profile = await this.getMe(req);
    const skills = profile.skills || [];
    return this.agentService.login(profile.agentId, skills, req.ip);
  }

  @Post('me/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const profile = await this.getMe(req);
    return this.agentService.logout(profile.agentId);
  }

  /* ── Groups CRUD ─────────────────────────────────── */

  @Get('groups/list')
  async listGroups() {
    return this.agentService.listGroups();
  }

  @Post('groups')
  async createGroup(@Body() body: { name: string; description?: string; requiredSkills?: { skill: string; minProficiency: number }[] }) {
    return this.agentService.createGroup(body);
  }

  @Get('groups/:id')
  async getGroup(@Param('id') id: string) {
    return this.agentService.getGroup(id);
  }

  @Post('groups/:id/members')
  async addMember(@Param('id') id: string, @Body() body: { agentId: string }) {
    return this.agentService.addAgentToGroup(id, body.agentId);
  }

  /* ── Skills CRUD ─────────────────────────────────── */

  @Get('skills/list')
  async listSkills() {
    return this.agentService.listSkills();
  }

  @Post('skills')
  async createSkill(@Body() body: { name: string; category: string; description?: string }) {
    return this.agentService.createSkill(body);
  }
}
