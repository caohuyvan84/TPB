import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { KafkaEvent } from '../interfaces/kafka-event.interface';

export type KafkaMessageHandler<T = unknown> = (
  event: KafkaEvent<T>,
  payload: EachMessagePayload,
) => Promise<void>;

@Injectable()
export class KafkaConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private kafka!: Kafka;
  private consumers: Consumer[] = [];

  constructor(private configService: ConfigService) {
    const brokers = (
      this.configService.get('KAFKA_BROKERS') || 'localhost:9092'
    ).split(',');
    const clientId =
      this.configService.get('KAFKA_CLIENT_ID') || 'tpb-crm';

    this.kafka = new Kafka({ clientId, brokers });
  }

  async onModuleDestroy() {
    await Promise.all(
      this.consumers.map((c) => c.disconnect().catch(() => {})),
    );
  }

  /**
   * Subscribe to one or more topics and handle each message.
   *
   * @param groupId   Consumer group ID
   * @param topics    Array of topic names to subscribe to
   * @param handler   Callback invoked for each message
   */
  async subscribe<T = unknown>(
    groupId: string,
    topics: string[],
    handler: KafkaMessageHandler<T>,
  ): Promise<void> {
    const consumer = this.kafka.consumer({ groupId });
    this.consumers.push(consumer);

    try {
      await consumer.connect();
      await consumer.subscribe({
        topics,
        fromBeginning: false,
      });

      await consumer.run({
        eachMessage: async (payload) => {
          try {
            const event: KafkaEvent<T> = JSON.parse(
              payload.message.value?.toString() || '{}',
            );
            await handler(event, payload);
          } catch (err) {
            this.logger.error(
              `Error processing message from ${payload.topic}: ${err}`,
            );
          }
        },
      });

      this.logger.log(
        `Consumer group "${groupId}" subscribed to: ${topics.join(', ')}`,
      );
    } catch (err) {
      this.logger.warn(
        `Kafka consumer "${groupId}" failed to start — running without Kafka: ${err}`,
      );
    }
  }
}
