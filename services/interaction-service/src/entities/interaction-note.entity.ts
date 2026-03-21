import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Interaction } from './interaction.entity';

@Entity('interaction_notes')
export class InteractionNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'interaction_id', type: 'uuid' })
  @Index()
  interactionId!: string;

  @ManyToOne(() => Interaction, (interaction) => interaction.notes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'interaction_id' })
  interaction!: Interaction;

  @Column({ name: 'agent_id', type: 'varchar', length: 255 })
  agentId!: string;

  @Column({ name: 'agent_name' })
  agentName!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ nullable: true })
  tag?: string;

  @Column({ name: 'is_pinned', default: false })
  isPinned!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
