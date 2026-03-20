import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CtiConfig } from '../entities';
import { CtiService } from './cti.service';
import { CtiController } from './cti.controller';
import { CtiEventsGateway } from './cti-events.gateway';
import { CdrConsumerService } from './cdr-consumer.service';
import { PushService } from './push.service';
import { KafkaModule } from 'nest-kafka';

@Module({
  imports: [TypeOrmModule.forFeature([CtiConfig]), KafkaModule],
  controllers: [CtiController],
  providers: [CtiService, CtiEventsGateway, CdrConsumerService, PushService],
  exports: [CtiService, CtiEventsGateway, PushService],
})
export class CtiModule {}
