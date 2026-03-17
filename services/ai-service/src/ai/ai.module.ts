import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIRequest } from '../entities';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AIRequest])],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AIModule {}
