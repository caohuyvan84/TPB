import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RoutingService } from './routing.service';

@Controller('routing')
export class RoutingController {
  constructor(private routingService: RoutingService) {}

  @Get('health')
  health() {
    return { status: 'ok', service: 'routing-engine' };
  }

  /* ── Queues ──────────────────────────────────────── */

  @Get('queues')
  listQueues() {
    return this.routingService.listQueues();
  }

  @Post('queues')
  createQueue(@Body() body: { name: string; channelType: string; slaSeconds?: number; requiredSkills?: string[] }) {
    return this.routingService.createQueue(body);
  }

  @Get('queues/:id')
  getQueue(@Param('id') id: string) {
    return this.routingService.getQueue(id);
  }

  /* ── Rules ───────────────────────────────────────── */

  @Get('rules')
  listRules() {
    return this.routingService.listRules();
  }

  @Post('rules')
  createRule(@Body() body: { name: string; priority: number; conditions: Record<string, any>; targetQueueId: string }) {
    return this.routingService.createRule(body);
  }

  /* ── Route / Assign ──────────────────────────────── */

  @Post('enqueue')
  enqueue(@Body() body: { queueId: string; interactionId: string; priority?: number }) {
    return this.routingService.enqueue(body.queueId, body.interactionId, body.priority);
  }

  @Post('queues/:id/dequeue')
  dequeueAndAssign(@Param('id') id: string) {
    return this.routingService.dequeueAndAssign(id);
  }
}
