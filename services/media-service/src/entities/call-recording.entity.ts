import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('call_recordings')
export class CallRecording {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @Column({ name: 'interaction_id', type: 'uuid' })
  @Index()
  interactionId!: string;

  @Column({ name: 'media_file_id', type: 'uuid' })
  mediaFileId!: string;

  @Column({ name: 'call_direction' })
  callDirection!: string;

  @Column({ type: 'integer' })
  duration!: number;

  @Column({ name: 'recording_start', type: 'timestamptz' })
  recordingStart!: Date;

  @Column({ name: 'recording_end', type: 'timestamptz' })
  recordingEnd!: Date;

  @Column({ type: 'text', nullable: true })
  transcript?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
