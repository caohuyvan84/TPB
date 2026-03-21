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
var KafkaConsumerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.KafkaConsumerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const kafkajs_1 = require("kafkajs");
let KafkaConsumerService = KafkaConsumerService_1 = class KafkaConsumerService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(KafkaConsumerService_1.name);
        this.consumers = [];
        const brokers = (this.configService.get('KAFKA_BROKERS') || 'localhost:9092').split(',');
        const clientId = this.configService.get('KAFKA_CLIENT_ID') || 'tpb-crm';
        this.kafka = new kafkajs_1.Kafka({ clientId, brokers });
    }
    async onModuleDestroy() {
        await Promise.all(this.consumers.map((c) => c.disconnect().catch(() => { })));
    }
    /**
     * Subscribe to one or more topics and handle each message.
     *
     * @param groupId   Consumer group ID
     * @param topics    Array of topic names to subscribe to
     * @param handler   Callback invoked for each message
     */
    async subscribe(groupId, topics, handler) {
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
                        const event = JSON.parse(payload.message.value?.toString() || '{}');
                        await handler(event, payload);
                    }
                    catch (err) {
                        this.logger.error(`Error processing message from ${payload.topic}: ${err}`);
                    }
                },
            });
            this.logger.log(`Consumer group "${groupId}" subscribed to: ${topics.join(', ')}`);
        }
        catch (err) {
            this.logger.warn(`Kafka consumer "${groupId}" failed to start — running without Kafka: ${err}`);
        }
    }
};
exports.KafkaConsumerService = KafkaConsumerService;
exports.KafkaConsumerService = KafkaConsumerService = KafkaConsumerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], KafkaConsumerService);
