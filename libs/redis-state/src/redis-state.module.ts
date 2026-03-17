import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisClientService } from './services/redis-client.service';
import { AgentStateService } from './services/agent-state.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [RedisClientService, AgentStateService],
  exports: [RedisClientService, AgentStateService],
})
export class RedisStateModule {}
