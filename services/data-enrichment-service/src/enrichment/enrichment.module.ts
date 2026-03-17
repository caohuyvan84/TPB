import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EnrichmentSource, EnrichmentRequest } from '../entities';
import { EnrichmentService } from './enrichment.service';
import { EnrichmentController } from './enrichment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EnrichmentSource, EnrichmentRequest])],
  controllers: [EnrichmentController],
  providers: [EnrichmentService],
  exports: [EnrichmentService],
})
export class EnrichmentModule {}
