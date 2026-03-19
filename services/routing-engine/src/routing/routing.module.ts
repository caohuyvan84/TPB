import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutingQueue, RoutingRule } from '../entities';
import { RoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { InboundConsumerService } from './inbound-consumer.service';

@Module({
  imports: [TypeOrmModule.forFeature([RoutingQueue, RoutingRule])],
  controllers: [RoutingController],
  providers: [RoutingService, InboundConsumerService],
  exports: [RoutingService],
})
export class RoutingModule {}
