import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaConsumerService, KafkaTopics } from 'nest-kafka';
import { InteractionService } from './interaction.service';
import { CallTimelineConsumerService } from './call-timeline-consumer.service';
import axios from 'axios';

const CUSTOMER_SERVICE_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3005';
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000000';

/**
 * Consumes call.answered events from GoACD (via Kafka).
 * When an inbound call is answered by agent:
 * 1. Lookup customer by callerNumber
 * 2. Create customer if not found
 * 3. Create Interaction record
 * 4. Publish interaction.created for frontend
 */
@Injectable()
export class CallEventConsumerService implements OnModuleInit {
  private readonly logger = new Logger(CallEventConsumerService.name);

  constructor(
    private kafkaConsumer: KafkaConsumerService,
    private interactionService: InteractionService,
    private callTimeline: CallTimelineConsumerService,
  ) {}

  async onModuleInit() {
    await this.kafkaConsumer.subscribe(
      'interaction-call-events',
      [KafkaTopics.CALL_ROUTING, KafkaTopics.CALL_ANSWERED, KafkaTopics.CALL_ENDED],
      async (event) => {
        const data = event.data as Record<string, unknown>;

        if (event.type === KafkaTopics.CALL_ROUTING) {
          await this.handleCallRouting(data);
        }

        if (event.type === KafkaTopics.CALL_ANSWERED && data['direction'] === 'inbound') {
          await this.handleInboundCallAnswered(data);
        }

        if (event.type === KafkaTopics.CALL_ENDED) {
          await this.handleCallEnded(data);
        }
      },
    );

    this.logger.log('Subscribed to call.routing + call.answered + call.ended');
  }

  private async handleCallRouting(data: Record<string, unknown>) {
    const callerNumber = (data['callerNumber'] || '') as string;
    const agentId = (data['agentId'] || '') as string;
    const callId = (data['callId'] || '') as string;
    const queue = (data['queue'] || '') as string;
    const waitTimeMs = (data['waitTimeMs'] || 0) as number;

    this.logger.log(`Call routing: ${callerNumber} → agent ${agentId} (queue: ${queue})`);

    // Lookup customer
    let customerId = '';
    let customerName = callerNumber;
    try {
      const resp = await axios.get(`${CUSTOMER_SERVICE_URL}/api/v1/customers`, {
        params: { search: callerNumber },
        timeout: 3000,
      });
      const customers = resp.data?.data || resp.data || [];
      if (Array.isArray(customers) && customers.length > 0) {
        customerId = customers[0].id;
        customerName = customers[0].fullName || customers[0].name || callerNumber;
      }
    } catch {}

    if (!customerId) {
      try {
        const resp = await axios.post(`${CUSTOMER_SERVICE_URL}/api/v1/customers`, {
          fullName: callerNumber, phone: callerNumber, tenantId: DEFAULT_TENANT,
        }, { timeout: 3000 });
        customerId = resp.data?.id || DEFAULT_TENANT;
      } catch {
        customerId = DEFAULT_TENANT;
      }
    }

    // Create interaction EARLY (status=new, before agent answers)
    try {
      const newInteraction = await this.interactionService.createInteraction({
        type: 'call',
        channel: 'voice',
        customerId,
        customerName,
        direction: 'inbound',
        subject: `Cuộc gọi đến từ ${callerNumber}`,
        priority: 'medium',
        metadata: { callerNumber, callId, queue, waitTimeMs, assignedAgentId: agentId },
      });

      // Assign agent immediately (agentId from call.routing = agent being routed to)
      if (agentId && newInteraction?.id) {
        try {
          await this.interactionService.assignAgent(newInteraction.id, agentId, agentId);
        } catch { /* non-critical */ }
      }
      this.logger.log(`Interaction created (routing) for ${callerNumber} → ${customerName}`);

      // Link orphan timeline events (IVR events happened before interaction was created)
      try {
        const interactions = await this.interactionService.findByMetadataCallId(callId);
        if (interactions.length > 0) {
          const linked = await this.callTimeline.linkOrphanEvents(callId, interactions[0].id);
          if (linked > 0) {
            this.logger.log(`Linked ${linked} orphan timeline events for call ${callId}`);
          }
        }
      } catch { /* non-critical */ }
    } catch (err) {
      this.logger.error(`Failed to create interaction (routing): ${err}`);
    }
  }

  private async handleInboundCallAnswered(data: Record<string, unknown>) {
    const callId = (data['callId'] || '') as string;
    const agentId = (data['agentId'] || '') as string;

    this.logger.log(`Inbound call answered: callId=${callId} agent=${agentId}`);

    // Update existing interaction (created in handleCallRouting) to in-progress + assign agent
    try {
      const interactions = await this.interactionService.findByMetadataCallId(callId);
      for (const interaction of interactions) {
        if (interaction.status === 'new' || interaction.status === 'in-progress') {
          await this.interactionService.updateStatus(interaction.id, 'in-progress');
          // Assign/confirm agent who answered
          if (agentId) {
            await this.interactionService.assignAgent(interaction.id, agentId, agentId);
          }
          this.logger.log(`Interaction ${interaction.displayId} → in-progress, agent=${agentId}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to update interaction for answered call ${callId}: ${err}`);
    }
  }

  private async handleCallEnded(data: Record<string, unknown>) {
    const callId = (data['callId'] || '') as string;
    this.logger.log(`Call ended: ${callId}`);

    // Find interaction by callId in metadata and close it
    try {
      const interactions = await this.interactionService.findByMetadataCallId(callId);
      for (const interaction of interactions) {
        if (interaction.status !== 'closed' && interaction.status !== 'completed') {
          await this.interactionService.updateStatus(interaction.id, 'completed');
          this.logger.log(`Interaction ${interaction.displayId} closed for call ${callId}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to close interaction for call ${callId}: ${err}`);
    }
  }
}
