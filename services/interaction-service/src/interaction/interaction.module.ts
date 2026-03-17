import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Interaction, InteractionNote, InteractionEvent } from '../entities';
import { InteractionService } from './interaction.service';
import { InteractionController } from './interaction.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Interaction, InteractionNote, InteractionEvent]),
  ],
  controllers: [InteractionController],
  providers: [InteractionService],
  exports: [InteractionService],
})
export class InteractionModule {}
