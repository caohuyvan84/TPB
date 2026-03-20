import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaConsumerService, KafkaTopics } from 'nest-kafka';
import { CtiEventsGateway } from './cti-events.gateway';
import { PushService } from './push.service';

/**
 * Consumes CDR events from Kafka (published by GoACD) and:
 * 1. Broadcasts call events to frontend via WebSocket
 * 2. Sends Web Push notifications for incoming calls (background tab backup)
 * 3. Future: persists CDR to database and links to Interaction
 */
@Injectable()
export class CdrConsumerService implements OnModuleInit {
  private readonly logger = new Logger(CdrConsumerService.name);

  constructor(
    private kafkaConsumer: KafkaConsumerService,
    private ctiEvents: CtiEventsGateway,
    private pushService: PushService,
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

    // Subscribe to GoACD call routing/state events — forward to Frontend via Socket.IO
    await this.kafkaConsumer.subscribe(
      'cti-call-events',
      [
        KafkaTopics.CALL_ROUTING,
        KafkaTopics.CALL_ANSWERED,
        KafkaTopics.CALL_TRANSFERRED,
        KafkaTopics.CALL_ENDED,
        KafkaTopics.CALL_AGENT_MISSED,
        KafkaTopics.CALL_OUTBOUND_INITIATED,
        KafkaTopics.CALL_OUTBOUND_RINGING,
        KafkaTopics.CALL_OUTBOUND_AGENT_ANSWER,
        KafkaTopics.CALL_OUTBOUND_FAILED,
        KafkaTopics.AGENT_STATUS_CHANGED_GOACD,
      ],
      async (event) => {
        const data = event.data as Record<string, unknown>;
        const topicToEvent: Record<string, string> = {
          [KafkaTopics.CALL_ROUTING]: 'call:incoming',
          [KafkaTopics.CALL_ANSWERED]: 'call:answered',
          [KafkaTopics.CALL_TRANSFERRED]: 'call:transferred',
          [KafkaTopics.CALL_ENDED]: 'call:ended',
          [KafkaTopics.CALL_AGENT_MISSED]: 'call:agent_missed',
          [KafkaTopics.CALL_OUTBOUND_INITIATED]: 'call:outbound_initiated',
          [KafkaTopics.CALL_OUTBOUND_RINGING]: 'call:outbound_ringing',
          [KafkaTopics.CALL_OUTBOUND_AGENT_ANSWER]: 'call:outbound_agent_answer',
          [KafkaTopics.CALL_OUTBOUND_FAILED]: 'call:outbound_failed',
          [KafkaTopics.AGENT_STATUS_CHANGED_GOACD]: 'agent:status_changed',
        };
        const wsEvent = topicToEvent[event.type];
        if (wsEvent) {
          const agentId = (data['agentId'] || data['assignedAgent']) as string;
          if (agentId) {
            // Agent-scoped delivery — only target agent receives event
            this.logger.log(`Call event [${event.type}] → WS [${wsEvent}] → agent:${agentId}`);
            this.ctiEvents.sendToAgent(agentId, wsEvent, data);

            // Web Push backup for incoming calls (Layer 2 — background tab protection)
            if (event.type === KafkaTopics.CALL_ROUTING) {
              this.pushService.sendPush(agentId, {
                type: 'incoming_call',
                callerNumber: data['callerNumber'],
                callerName: data['callerName'],
                queue: data['queue'],
                callId: data['callId'],
                agentId,
              }).catch(() => {});
            }
            // Close incoming call notification when call ends/answered/missed
            if (event.type === KafkaTopics.CALL_ANSWERED || event.type === KafkaTopics.CALL_ENDED) {
              this.pushService.sendPush(agentId, {
                type: event.type === KafkaTopics.CALL_ANSWERED ? 'call_answered' : 'call_ended',
                callId: data['callId'],
                agentId,
              }).catch(() => {});
            }
            if (event.type === KafkaTopics.CALL_AGENT_MISSED) {
              this.pushService.sendPush(agentId, {
                type: 'call_missed',
                callerNumber: data['callerNumber'],
                callId: data['callId'],
                agentId,
              }).catch(() => {});
            }
          } else {
            // No agentId — broadcast (fallback)
            this.logger.log(`Call event [${event.type}] → WS [${wsEvent}] → broadcast`);
            this.ctiEvents.broadcastCallEvent(wsEvent, data);
          }
        }
      },
    );
  }
}
