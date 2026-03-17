import { DataSource } from 'typeorm';
import { CtiConfig } from './cti-config.entity';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env['POSTGRES_HOST'] || 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
  username: process.env['POSTGRES_USER'] || 'postgres',
  password: process.env['POSTGRES_PASSWORD'] || 'postgres',
  database: 'cti_db',
  entities: [CtiConfig],
  synchronize: true,
});
