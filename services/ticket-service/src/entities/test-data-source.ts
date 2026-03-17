import { DataSource } from 'typeorm';

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: 'ticket_db',
  entities: [__dirname + '/*.entity.{ts,js}'],
  synchronize: false,
  logging: false,
});
