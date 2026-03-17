import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BankProduct } from '../entities';
import { BFSIService } from './bfsi.service';
import { BFSIController } from './bfsi.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BankProduct])],
  controllers: [BFSIController],
  providers: [BFSIService],
  exports: [BFSIService],
})
export class BFSIModule {}
