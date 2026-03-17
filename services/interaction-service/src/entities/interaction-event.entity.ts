import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Interaction } from './interaction.entity';

@Entity('interaction_events')
export class InteractionEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  interactionId!: string;

  @ManyToOne(() => Interaction, (interaction) => interaction.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'interaction_id' })
  interaction!: Interaction;

  @Column()
  type!: string;

  @Column({ type: 'timestamptz' })
  timestamp!: Date;

  @Column({ nullable: true })
  duration?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid', nullable: true })
  agentId?: string;

  @Column({ type: 'jsonb', default: {} })
  data!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;
}
