import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Ticket } from './ticket.entity';

@Entity('ticket_history')
export class TicketHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_id' })
  ticketId!: string;

  @Column({ name: 'agent_id' })
  agentId!: string;

  @Column({ name: 'agent_name' })
  agentName!: string;

  @Column({ name: 'field_name' })
  fieldName!: string;

  @Column({ name: 'old_value', nullable: true })
  oldValue?: string;

  @Column({ name: 'new_value', nullable: true })
  newValue?: string;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt!: Date;

  @ManyToOne(() => Ticket, (ticket) => ticket.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: Ticket;
}
