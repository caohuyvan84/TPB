import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CtiModule } from '../cti/cti.module';
import { CtiConfig } from '../entities';
import { KafkaModule } from 'nest-kafka';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['POSTGRES_HOST'] || 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
      username: process.env['POSTGRES_USER'] || 'postgres',
      password: process.env['POSTGRES_PASSWORD'] || 'postgres',
      database: 'cti_db',
      entities: [CtiConfig],
      synchronize: true,
    }),
    KafkaModule,
    CtiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
