import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentProfile, AgentChannelStatus, AgentSession } from '../entities';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentGateway } from './agent.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentProfile, AgentChannelStatus, AgentSession]),
  ],
  controllers: [AgentController],
  providers: [AgentService, AgentGateway],
  exports: [AgentService],
})
export class AgentModule {}
