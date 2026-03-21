import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('call_timeline_events')
export class CallTimelineEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'call_id' })
  callId!: string;

  @Column({ name: 'interaction_id', nullable: true })
  interactionId!: string;

  @Column({ name: 'event_type' })
  eventType!: string;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ type: 'jsonb', default: {} })
  data!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
