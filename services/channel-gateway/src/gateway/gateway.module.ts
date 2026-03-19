import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChannelConfig } from '../entities';
import { AdapterRegistryService } from './adapter-registry.service';
import { GatewayController } from './gateway.controller';
import { InboundConsumerService } from './inbound-consumer.service';

@Module({
  imports: [TypeOrmModule.forFeature([ChannelConfig])],
  controllers: [GatewayController],
  providers: [AdapterRegistryService, InboundConsumerService],
  exports: [AdapterRegistryService],
})
export class GatewayModule {}
