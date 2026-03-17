import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObjectType, FieldDefinition } from './entities';
import { SchemaModule } from './schema/schema.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['POSTGRES_HOST'] || 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
      username: process.env['POSTGRES_USER'] || 'postgres',
      password: process.env['POSTGRES_PASSWORD'] || 'postgres',
      database: 'object_schema_db',
      entities: [ObjectType, FieldDefinition],
      synchronize: false,
    }),
    SchemaModule,
  ],
})
export class AppModule {}
