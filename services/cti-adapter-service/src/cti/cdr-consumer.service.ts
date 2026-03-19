import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaConsumerService, KafkaTopics } from 'nest-kafka';
import { CtiEventsGateway } from './cti-events.gateway';

/**
 * Consumes CDR events from Kafka (published by GoACD) and:
 * 1. Broadcasts call events to frontend via WebSocket
 * 2. Future: persists CDR to database and links to Interaction
 */
@Injectable()
export class CdrConsumerService implements OnModuleInit {
  private readonly logger = new Logger(CdrConsumerService.name);

  constructor(
    private kafkaConsumer: KafkaConsumerService,
    private ctiEvents: CtiEventsGateway,
  ) {}

  async onModuleInit() {
    // Subscribe to CDR events
    await this.kafkaConsumer.subscribe(
      'cti-cdr-consumer',
      [KafkaTopics.CDR_CREATED],
      async (event) => {
        this.logger.log(`CDR received: ${event.eventId}`);
        const cdr = event.data as Record<string, unknown>;

        // Broadcast call:ended event to frontend
        this.ctiEvents.broadcastCallEvent('call:ended', {
          callId: cdr['callId'],
          callerNumber: cdr['callerNumber'],
          assignedAgent: cdr['assignedAgent'],
          durationMs: cdr['durationMs'],
          talkTimeMs: cdr['talkTimeMs'],
          hangupCause: cdr['hangupCause'],
        });

        // TODO: persist CDR to DB and link to Interaction
      },
    );

    // Subscribe to interaction events for real-time push
    await this.kafkaConsumer.subscribe(
      'cti-interaction-consumer',
      [
        KafkaTopics.INTERACTION_CREATED,
        KafkaTopics.INTERACTION_ASSIGNED,
      ],
      async (event) => {
        const data = event.data as Record<string, unknown>;

        if (event.type === KafkaTopics.INTERACTION_CREATED) {
          this.ctiEvents.broadcastCallEvent('call:incoming', {
            interactionId: data['interactionId'],
            channel: data['channel'],
            customerId: data['customerId'],
          });
        }

        if (event.type === KafkaTopics.INTERACTION_ASSIGNED) {
          this.ctiEvents.broadcastCallEvent('call:assigned', {
            interactionId: data['interactionId'],
            agentId: data['agentId'],
          });
        }
      },
    );
  }
}
