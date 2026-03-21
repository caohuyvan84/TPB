import { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EachMessagePayload } from 'kafkajs';
import { KafkaEvent } from '../interfaces/kafka-event.interface';
export type KafkaMessageHandler<T = unknown> = (event: KafkaEvent<T>, payload: EachMessagePayload) => Promise<void>;
export declare class KafkaConsumerService implements OnModuleDestroy {
    private configService;
    private readonly logger;
    private kafka;
    private consumers;
    constructor(configService: ConfigService);
    onModuleDestroy(): Promise<void>;
    /**
     * Subscribe to one or more topics and handle each message.
     *
     * @param groupId   Consumer group ID
     * @param topics    Array of topic names to subscribe to
     * @param handler   Callback invoked for each message
     */
    subscribe<T = unknown>(groupId: string, topics: string[], handler: KafkaMessageHandler<T>): Promise<void>;
}
