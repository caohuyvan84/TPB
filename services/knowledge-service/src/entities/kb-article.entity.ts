import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { KbFolder } from './kb-folder.entity';

@Entity('kb_articles')
export class KbArticle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags!: string[];

  @Column({ type: 'text', nullable: true })
  category!: string | null;

  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId!: string | null;

  @ManyToOne(() => KbFolder, { nullable: true })
  @JoinColumn({ name: 'folder_id' })
  folder!: KbFolder | null;

  @Column({ name: 'view_count', default: 0 })
  viewCount!: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  rating!: number | null;

  @Column({ name: 'dynamic_fields', type: 'jsonb', default: '{}' })
  dynamicFields!: Record<string, any>;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
