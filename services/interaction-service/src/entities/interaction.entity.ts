import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { InteractionNote } from './interaction-note.entity';
import { InteractionEvent } from './interaction-event.entity';

@Entity('interactions')
export class Interaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, name: 'display_id' })
  displayId!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  tenantId!: string;

  @Column()
  type!: 'call' | 'missed-call' | 'email' | 'chat';

  @Column()
  channel!: 'voice' | 'email' | 'chat';

  @Column()
  @Index()
  status!: string;

  @Column({ default: 'medium' })
  priority!: string;

  @Column({ type: 'uuid', name: 'customer_id' })
  @Index()
  customerId!: string;

  @Column({ nullable: true, name: 'customer_name' })
  customerName?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'assigned_agent_id' })
  @Index()
  assignedAgentId?: string;

  @Column({ nullable: true, name: 'assigned_agent_name' })
  assignedAgentName?: string;

  @Column({ nullable: true })
  subject?: string;

  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  @Column({ default: false, name: 'is_vip' })
  isVip!: boolean;

  @Column({ nullable: true })
  direction?: string;

  @Column({ nullable: true })
  source?: string;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  @Column({ type: 'jsonb', default: {}, name: 'dynamic_fields' })
  dynamicFields!: Record<string, any>;

  @Column({ type: 'timestamptz', nullable: true, name: 'sla_due_at' })
  slaDueAt?: Date;

  @Column({ default: false, name: 'sla_breached' })
  slaBreached!: boolean;

  @OneToMany(() => InteractionNote, (note) => note.interaction)
  notes!: InteractionNote[];

  @OneToMany(() => InteractionEvent, (event) => event.interaction)
  events!: InteractionEvent[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'closed_at' })
  closedAt?: Date;
}
