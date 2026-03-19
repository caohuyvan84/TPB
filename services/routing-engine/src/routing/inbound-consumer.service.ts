import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaConsumerService, KafkaProducerService, KafkaTopics } from 'nest-kafka';
import { RoutingService } from './routing.service';

/**
 * Consumes routing.inbound events from Channel Gateway and:
 * 1. Creates an Interaction (via Kafka event → Interaction Service)
 * 2. Resolves the target queue
 * 3. Enqueues and attempts immediate assignment
 */
@Injectable()
export class InboundConsumerService implements OnModuleInit {
  private readonly logger = new Logger(InboundConsumerService.name);

  constructor(
    private kafkaConsumer: KafkaConsumerService,
    private kafkaProducer: KafkaProducerService,
    private routingService: RoutingService,
  ) {}

  async onModuleInit() {
    await this.kafkaConsumer.subscribe(
      'routing-engine-inbound',
      ['routing.inbound'],
      async (event) => {
        const data = event.data as Record<string, any>;
        this.logger.log(`Inbound message: ${data.messageId} (${data.channelType})`);

        // Step 1: Publish interaction.created for Interaction Service to pick up
        await this.kafkaProducer.publish(
          KafkaTopics.INTERACTION_CREATED,
          {
            interactionId: data.messageId,
            channel: data.channelType,
            customerId: data.from,
            customerName: data.metadata?.callerName,
            direction: data.direction,
            metadata: data.metadata,
          },
          'routing-engine',
          data.messageId,
        );

        // Step 2: Resolve queue based on channel type and metadata
        const queue = await this.routingService.resolveQueue(
          data.channelType,
          data.metadata || {},
        );

        if (!queue) {
          this.logger.warn(`No queue found for ${data.channelType}`);
          return;
        }

        // Step 3: Enqueue
        await this.routingService.enqueue(queue.id, data.messageId, 0);

        // Step 4: Try immediate assignment
        const result = await this.routingService.dequeueAndAssign(queue.id);
        if (result) {
          this.logger.log(`Immediate assignment: ${result.interactionId} → ${result.agentId}`);
        } else {
          this.logger.log(`No agent available — ${data.messageId} waiting in queue ${queue.name}`);
        }
      },
    );

    // Start SLA enforcement timer
    this.routingService.startSlaEnforcement();
    this.logger.log('Routing Engine inbound consumer ready');
  }
}
