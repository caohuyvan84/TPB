import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Partitioners } from 'kafkajs';
import { randomUUID } from 'crypto';
import { KafkaEvent } from '../interfaces/kafka-event.interface';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka!: Kafka;
  private producer!: Producer;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const brokers = (
      this.configService.get('KAFKA_BROKERS') || 'localhost:9092'
    ).split(',');
    const clientId =
      this.configService.get('KAFKA_CLIENT_ID') || 'tpb-crm';

    this.kafka = new Kafka({ clientId, brokers });
    this.producer = this.kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });

    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (err) {
      this.logger.warn(`Kafka producer connect failed — running without Kafka: ${err}`);
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer?.disconnect();
    } catch {
      /* ignore */
    }
  }

  /**
   * Publish a typed event to a Kafka topic.
   *
   * @param topic  Kafka topic name (e.g. 'agent.login')
   * @param data   Payload object
   * @param source Service name that produced the event
   * @param key    Optional partition key (e.g. agentId)
   */
  async publish<T>(
    topic: string,
    data: T,
    source: string,
    key?: string,
  ): Promise<void> {
    const event: KafkaEvent<T> = {
      eventId: randomUUID(),
      timestamp: new Date().toISOString(),
      type: topic,
      source,
      data,
    };

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: key ?? null,
            value: JSON.stringify(event),
          },
        ],
      });
    } catch (err) {
      this.logger.error(`Failed to publish to ${topic}: ${err}`);
    }
  }
}
