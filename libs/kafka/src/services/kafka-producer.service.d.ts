import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private readonly logger;
    private kafka;
    private producer;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    /**
     * Publish a typed event to a Kafka topic.
     *
     * @param topic  Kafka topic name (e.g. 'agent.login')
     * @param data   Payload object
     * @param source Service name that produced the event
     * @param key    Optional partition key (e.g. agentId)
     */
    publish<T>(topic: string, data: T, source: string, key?: string): Promise<void>;
}
