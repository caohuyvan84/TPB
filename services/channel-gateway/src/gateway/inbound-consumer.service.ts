import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KafkaConsumerService, KafkaProducerService, KafkaTopics } from 'nest-kafka';
import { AdapterRegistryService } from './adapter-registry.service';
import { VoiceChannelAdapter } from './voice-adapter';

/**
 * Consumes channel.inbound events from Kafka and routes them through
 * the adapter pipeline to the Routing Engine.
 */
@Injectable()
export class InboundConsumerService implements OnModuleInit {
  private readonly logger = new Logger(InboundConsumerService.name);

  constructor(
    private registry: AdapterRegistryService,
    private kafkaConsumer: KafkaConsumerService,
    private kafkaProducer: KafkaProducerService,
  ) {}

  async onModuleInit() {
    // Register the voice adapter
    const voiceAdapter = new VoiceChannelAdapter();
    await voiceAdapter.initialize();
    this.registry.register(voiceAdapter);

    // Subscribe to inbound channel events
    await this.kafkaConsumer.subscribe(
      'channel-gateway-inbound',
      [KafkaTopics.CHANNEL_INBOUND],
      async (event) => {
        const data = event.data as Record<string, unknown>;
        const channelType = (data['channelType'] as string) || 'voice';

        const adapter = this.registry.get(channelType);
        if (!adapter) {
          this.logger.warn(`No adapter for channel: ${channelType}`);
          return;
        }

        // Normalize the raw event into a ChannelMessage
        const message = adapter.normalize(data);
        this.logger.log(`Normalized inbound message: ${message.messageId} (${channelType})`);

        // Forward to Routing Engine via Kafka
        await this.kafkaProducer.publish(
          'routing.inbound',
          {
            messageId: message.messageId,
            channelType: message.channelType,
            direction: message.direction,
            from: message.from,
            to: message.to,
            metadata: message.metadata,
          },
          'channel-gateway',
          message.messageId,
        );
      },
    );
  }
}
