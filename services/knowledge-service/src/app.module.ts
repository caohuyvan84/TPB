import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { KbArticle, KbFolder, KbBookmark } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['POSTGRES_HOST'] || 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
      username: process.env['POSTGRES_USER'] || 'postgres',
      password: process.env['POSTGRES_PASSWORD'] || 'postgres',
      database: process.env['DB_KNOWLEDGE'] || 'knowledge_db',
      entities: [KbArticle, KbFolder, KbBookmark],
      synchronize: false,
      logging: false,
    }),
    KnowledgeModule,
  ],
})
export class AppModule {}
