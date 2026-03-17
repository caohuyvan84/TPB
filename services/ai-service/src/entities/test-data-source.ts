import { DataSource } from 'typeorm';
import { AIRequest } from './index';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env['POSTGRES_HOST'] || 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
  username: process.env['POSTGRES_USER'] || 'postgres',
  password: process.env['POSTGRES_PASSWORD'] || 'postgres',
  database: process.env['DB_AI'] || 'ai_db',
  entities: [AIRequest],
  synchronize: false,
  logging: false,
});
