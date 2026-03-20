import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KafkaConsumerService } from 'nest-kafka';
import { CallTimelineEvent } from '../entities/call-timeline-event.entity';

const CALL_TIMELINE_TOPIC = 'call.timeline';

/**
 * Consumes call.timeline events from Kafka (published by GoACD).
 * Saves detailed call flow events (IVR, queue, routing, ringing, answered, ended, etc.)
 * to call_timeline_events table for display in InteractionDetail CallTimeline.
 */
@Injectable()
export class CallTimelineConsumerService implements OnModuleInit {
  private readonly logger = new Logger(CallTimelineConsumerService.name);

  constructor(
    private kafkaConsumer: KafkaConsumerService,
    @InjectRepository(CallTimelineEvent)
    private timelineRepo: Repository<CallTimelineEvent>,
  ) {}

  async onModuleInit() {
    await this.kafkaConsumer.subscribe(
      'interaction-call-timeline',
      [CALL_TIMELINE_TOPIC],
      async (event) => {
        const data = event.data as Record<string, unknown>;
        const callId = (data['callId'] || '') as string;
        const eventType = (data['eventType'] || '') as string;
        const timestamp = (data['timestamp'] || '') as string;
        const eventData = (data['data'] || {}) as Record<string, unknown>;

        if (!callId || !eventType) {
          this.logger.warn('Invalid timeline event — missing callId or eventType');
          return;
        }

        // Lookup interactionId from callId
        let interactionId: string | null = null;
        try {
          const result = await this.timelineRepo.manager.query(
            `SELECT id FROM interactions WHERE metadata->>'callId' = $1 LIMIT 1`,
            [callId],
          );
          if (result.length > 0) {
            interactionId = result[0].id;
          }
        } catch { /* interaction may not exist yet for early events */ }

        // Save event
        const entity = this.timelineRepo.create({
          callId,
          interactionId: interactionId || undefined,
          eventType,
          timestamp: new Date(timestamp || Date.now()),
          data: eventData,
        });

        await this.timelineRepo.save(entity);

        this.logger.debug(`Timeline: ${eventType} for call ${callId.substring(0, 8)}...`);
      },
    );

    this.logger.log(`Subscribed to ${CALL_TIMELINE_TOPIC}`);
  }

  /** Link orphan events to interaction (called when interaction is created). */
  async linkOrphanEvents(callId: string, interactionId: string): Promise<number> {
    const result = await this.timelineRepo.update(
      { callId, interactionId: undefined as any },
      { interactionId },
    );
    return result.affected || 0;
  }

  /** Get all timeline events for an interaction. */
  async getByInteractionId(interactionId: string): Promise<CallTimelineEvent[]> {
    // First try by interactionId
    let events = await this.timelineRepo.find({
      where: { interactionId },
      order: { timestamp: 'ASC' },
    });

    // If no events found, try by callId from interaction metadata
    if (events.length === 0) {
      try {
        const result = await this.timelineRepo.manager.query(
          `SELECT metadata->>'callId' as call_id FROM interactions WHERE id = $1`,
          [interactionId],
        );
        if (result.length > 0 && result[0].call_id) {
          events = await this.timelineRepo.find({
            where: { callId: result[0].call_id },
            order: { timestamp: 'ASC' },
          });
        }
      } catch { /* ignore */ }
    }

    return events;
  }
}
