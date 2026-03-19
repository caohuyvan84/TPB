import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentProfile, AgentChannelStatus, AgentSession, AgentGroup, SkillDefinition } from '../entities';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentGateway } from './agent.gateway';
import { InteractionConsumerService } from './interaction-consumer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentProfile, AgentChannelStatus, AgentSession, AgentGroup, SkillDefinition]),
  ],
  controllers: [AgentController],
  providers: [AgentService, AgentGateway, InteractionConsumerService],
  exports: [AgentService],
})
export class AgentModule {}
