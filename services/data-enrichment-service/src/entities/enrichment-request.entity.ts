import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EnrichmentSource } from './enrichment-source.entity';

@Entity('enrichment_requests')
export class EnrichmentRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column('uuid')
  sourceId!: string;

  @ManyToOne(() => EnrichmentSource)
  @JoinColumn({ name: 'source_id' })
  source?: EnrichmentSource;

  @Column()
  objectType!: string;

  @Column('uuid')
  objectId!: string;

  @Column()
  status!: string;

  @Column('jsonb', { nullable: true })
  requestPayload?: object;

  @Column('jsonb', { nullable: true })
  responseData?: object;

  @Column({ nullable: true })
  error?: string;

  @Column({ nullable: true })
  durationMs?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
