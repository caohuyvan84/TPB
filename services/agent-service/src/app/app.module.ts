import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentModule } from '../agent/agent.module';
import { AgentProfile, AgentChannelStatus, AgentSession, AgentGroup, SkillDefinition } from '../entities';
import { KafkaModule } from 'nest-kafka';
import { RedisStateModule } from 'nest-redis-state';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: 'agent_db',
      entities: [AgentProfile, AgentChannelStatus, AgentSession, AgentGroup, SkillDefinition],
      synchronize: true,
    }),
    KafkaModule,
    RedisStateModule,
    AgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
