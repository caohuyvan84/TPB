import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InteractionModule } from '../interaction/interaction.module';
import { Interaction, InteractionNote, InteractionEvent } from '../entities';
import { CallTimelineEvent } from '../entities/call-timeline-event.entity';
import { KafkaModule } from 'nest-kafka';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: 'interaction_db',
      entities: [Interaction, InteractionNote, InteractionEvent, CallTimelineEvent],
      synchronize: true,
    }),
    KafkaModule,
    InteractionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
