import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObjectType, FieldDefinition } from '../entities';
import { SchemaService } from './schema.service';
import { SchemaController } from './schema.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ObjectType, FieldDefinition])],
  controllers: [SchemaController],
  providers: [SchemaService],
  exports: [SchemaService],
})
export class SchemaModule {}
