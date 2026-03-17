import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RoutingQueue, RoutingRule } from '../entities';
import { RoutingModule } from '../routing/routing.module';
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
      database: 'routing_engine_db',
      entities: [RoutingQueue, RoutingRule],
      synchronize: true,
    }),
    KafkaModule,
    RedisStateModule,
    RoutingModule,
  ],
})
export class AppModule {}
