import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Layout } from '../entities';
import { LayoutService } from './layout.service';
import { LayoutController } from './layout.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Layout])],
  controllers: [LayoutController],
  providers: [LayoutService],
  exports: [LayoutService],
})
export class LayoutModule {}
