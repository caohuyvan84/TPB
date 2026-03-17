import { DataSource } from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';
import { RefreshToken } from './refresh-token.entity';
import { LoginAttempt } from './login-attempt.entity';

export const createTestDataSource = async (): Promise<DataSource> => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: 'identity_db',
    entities: [User, Role, RefreshToken, LoginAttempt],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
};
