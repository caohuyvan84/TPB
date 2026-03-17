import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { TicketComment } from './ticket-comment.entity';
import { TicketHistory } from './ticket-history.entity';

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'display_id', unique: true })
  displayId!: string;

  @Column({ name: 'tenant_id', default: '00000000-0000-0000-0000-000000000000' })
  tenantId!: string;

  @BeforeInsert()
  generateDisplayId() {
    if (!this.displayId) {
      this.displayId = `TKT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    }
    if (!this.tenantId) {
      this.tenantId = '00000000-0000-0000-0000-000000000000';
    }
  }

  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: 'open' })
  status!: string;

  @Column({ default: 'medium' })
  priority!: string;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true })
  department?: string;

  @Column({ name: 'assigned_agent_id', nullable: true })
  assignedAgentId?: string;

  @Column({ name: 'customer_id' })
  customerId!: string;

  @Column({ name: 'interaction_id', nullable: true })
  interactionId?: string;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt?: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'dynamic_fields', type: 'jsonb', default: {} })
  dynamicFields!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => TicketComment, (comment) => comment.ticket)
  comments!: TicketComment[];

  @OneToMany(() => TicketHistory, (history) => history.ticket)
  history!: TicketHistory[];
}
