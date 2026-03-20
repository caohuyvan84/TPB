import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction, InteractionNote, InteractionEvent } from '../entities';
import { CallTimelineEvent } from '../entities/call-timeline-event.entity';
import { InteractionService } from './interaction.service';
import { InteractionController } from './interaction.controller';
import { CallEventConsumerService } from './call-event-consumer.service';
import { CallTimelineConsumerService } from './call-timeline-consumer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interaction, InteractionNote, InteractionEvent, CallTimelineEvent]),
  ],
  controllers: [InteractionController],
  providers: [InteractionService, CallEventConsumerService, CallTimelineConsumerService],
  exports: [InteractionService, CallTimelineConsumerService],
})
export class InteractionModule {}
