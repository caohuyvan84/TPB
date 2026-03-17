import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { KbArticle } from './kb-article.entity';

@Entity('kb_bookmarks')
export class KbBookmark {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'article_id', type: 'uuid' })
  articleId!: string;

  @ManyToOne(() => KbArticle)
  @JoinColumn({ name: 'article_id' })
  article!: KbArticle;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
