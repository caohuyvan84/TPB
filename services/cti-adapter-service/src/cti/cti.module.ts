import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CtiConfig } from '../entities';
import { CtiService } from './cti.service';
import { CtiController } from './cti.controller';
import { CtiEventsGateway } from './cti-events.gateway';
import { CdrConsumerService } from './cdr-consumer.service';
import { KafkaModule } from 'nest-kafka';

@Module({
  imports: [TypeOrmModule.forFeature([CtiConfig]), KafkaModule],
  controllers: [CtiController],
  providers: [CtiService, CtiEventsGateway, CdrConsumerService],
  exports: [CtiService, CtiEventsGateway],
})
export class CtiModule {}
