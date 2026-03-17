import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('media_files')
export class MediaFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  @Index()
  uploadedBy!: string;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Column({ name: 'original_name' })
  originalName!: string;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize!: number;

  @Column({ name: 'storage_path' })
  storagePath!: string;

  @Column({ name: 'storage_bucket' })
  storageBucket!: string;

  @Column({ type: 'text', nullable: true })
  category?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
