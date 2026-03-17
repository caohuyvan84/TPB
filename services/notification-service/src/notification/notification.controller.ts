import { Controller, Get, Patch, Post, Param, Query, Body, Req } from '@nestjs/common';
import { Request } from 'express';
import { NotificationService } from './notification.service';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  async list(@Req() req: Request, @Query('limit') limit?: number) {
    const agentId = (req as any).user?.sub || (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
    return this.notificationService.listNotifications(agentId, limit);
  }

  @Get('unread-count')
  async getUnreadCount(@Req() req: Request) {
    const agentId = (req as any).user?.sub || (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
    const count = await this.notificationService.getUnreadCount(agentId);
    return { count };
  }

  @Patch(':id/state')
  async updateState(@Param('id') id: string, @Body() body: { state: string }) {
    return this.notificationService.updateState(id, body.state);
  }

  @Post('mark-all-read')
  async markAllRead(@Req() req: Request) {
    const agentId = (req as any).user?.sub || (req as any).user?.id || '00000000-0000-0000-0000-000000000001';
    return this.notificationService.markAllRead(agentId);
  }
}
