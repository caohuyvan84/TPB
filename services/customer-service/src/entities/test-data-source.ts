import { DataSource } from 'typeorm';
import { Customer, CustomerNote } from './';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: 'customer_db',
  entities: [Customer, CustomerNote],
  synchronize: true,
  dropSchema: true,
});
