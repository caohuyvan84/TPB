import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load .env file from service root
dotenv.config({ path: join(process.cwd(), '.env') });

console.log('TypeORM Config Debug:');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('POSTGRES_USER:', process.env.POSTGRES_USER);
console.log('POSTGRES_PASSWORD:', process.env.POSTGRES_PASSWORD ? '***' : 'NOT SET');
console.log('DB_IDENTITY:', process.env.DB_IDENTITY);

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.DB_IDENTITY || 'identity_db',
  entities: ['src/entities/**/*.entity.ts'],
  migrations: ['src/migrations/**/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
