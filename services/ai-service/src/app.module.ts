import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIModule } from './ai/ai.module';
import { AIRequest } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['POSTGRES_HOST'] || 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
      username: process.env['POSTGRES_USER'] || 'postgres',
      password: process.env['POSTGRES_PASSWORD'] || 'postgres',
      database: process.env['DB_AI'] || 'ai_db',
      entities: [AIRequest],
      synchronize: false,
      logging: false,
    }),
    AIModule,
  ],
})
export class AppModule {}
