"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var KafkaProducerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaProducerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const kafkajs_1 = require("kafkajs");
const crypto_1 = require("crypto");
let KafkaProducerService = KafkaProducerService_1 = class KafkaProducerService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(KafkaProducerService_1.name);
    }
    async onModuleInit() {
        const brokers = (this.configService.get('KAFKA_BROKERS') || 'localhost:9092').split(',');
        const clientId = this.configService.get('KAFKA_CLIENT_ID') || 'tpb-crm';
        this.kafka = new kafkajs_1.Kafka({ clientId, brokers });
        this.producer = this.kafka.producer({
            createPartitioner: kafkajs_1.Partitioners.DefaultPartitioner,
        });
        try {
            await this.producer.connect();
            this.logger.log('Kafka producer connected');
        }
        catch (err) {
            this.logger.warn(`Kafka producer connect failed — running without Kafka: ${err}`);
        }
    }
    async onModuleDestroy() {
        try {
            await this.producer?.disconnect();
        }
        catch {
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
    async publish(topic, data, source, key) {
        const event = {
            eventId: (0, crypto_1.randomUUID)(),
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
        }
        catch (err) {
            this.logger.error(`Failed to publish to ${topic}: ${err}`);
        }
    }
};
exports.KafkaProducerService = KafkaProducerService;
exports.KafkaProducerService = KafkaProducerService = KafkaProducerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KafkaProducerService);
