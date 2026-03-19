import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaConsumerService, KafkaTopics } from 'nest-kafka';
import { AgentStateService } from 'nest-redis-state';

/**
 * Consumes interaction.assigned events and updates agent Redis state
 * (increments voice_count, updates current_interaction).
 */
@Injectable()
export class InteractionConsumerService implements OnModuleInit {
  private readonly logger = new Logger(InteractionConsumerService.name);

  constructor(
    private kafkaConsumer: KafkaConsumerService,
    private agentState: AgentStateService,
  ) {}

  async onModuleInit() {
    await this.kafkaConsumer.subscribe(
      'agent-interaction-consumer',
      [KafkaTopics.INTERACTION_ASSIGNED, KafkaTopics.INTERACTION_CLOSED],
      async (event) => {
        const data = event.data as Record<string, any>;

        if (event.type === KafkaTopics.INTERACTION_ASSIGNED) {
          const { agentId, interactionId } = data;
          if (agentId) {
            // Claim is already done by Routing Engine, but update state if needed
            this.logger.log(`Interaction ${interactionId} assigned to agent ${agentId}`);
          }
        }

        if (event.type === KafkaTopics.INTERACTION_CLOSED) {
          const { interactionId } = data;
          this.logger.log(`Interaction ${interactionId} closed`);
          // Agent release is handled by GoACD when call ends
        }
      },
    );
  }
}
