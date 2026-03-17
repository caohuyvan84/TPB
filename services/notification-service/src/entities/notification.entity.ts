import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column({ name: 'agent_id' })
  agentId!: string;

  @Column()
  type!: string;

  @Column({ default: 'medium' })
  priority!: string;

  @Column({ default: 'new' })
  state!: string;

  @Column()
  title!: string;

  @Column()
  message!: string;

  @Column({ name: 'action_url', nullable: true })
  actionUrl?: string;

  @Column({ name: 'action_label', nullable: true })
  actionLabel?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ name: 'auto_hide_seconds', nullable: true })
  autoHideSeconds?: number;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
