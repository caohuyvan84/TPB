import { DataSource } from 'typeorm';
import { ObjectType } from './object-type.entity';
import { FieldDefinition } from './field-definition.entity';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env['POSTGRES_HOST'] || 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
  username: process.env['POSTGRES_USER'] || 'postgres',
  password: process.env['POSTGRES_PASSWORD'] || 'postgres',
  database: 'object_schema_db',
  entities: [ObjectType, FieldDefinition],
  synchronize: true,
});
