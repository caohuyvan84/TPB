import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CtiConfig } from '../entities';
import { CtiService } from './cti.service';
import { CtiController } from './cti.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CtiConfig])],
  controllers: [CtiController],
  providers: [CtiService],
  exports: [CtiService],
})
export class CtiModule {}
