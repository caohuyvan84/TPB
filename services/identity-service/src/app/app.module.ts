import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { User, Role, RefreshToken, LoginAttempt } from '../entities';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.DB_IDENTITY || 'identity_db',
      entities: [User, Role, RefreshToken, LoginAttempt],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
  ],
})
export class AppModule {}
