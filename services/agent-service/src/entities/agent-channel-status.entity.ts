import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { AgentProfile } from './agent-profile.entity';

@Entity('agent_channel_status')
@Unique(['agentId', 'channel'])
export class AgentChannelStatus {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  agentId!: string;

  @ManyToOne(() => AgentProfile, (profile) => profile.channelStatuses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agentId' })
  agent!: AgentProfile;

  @Column()
  channel!: 'voice' | 'email' | 'chat';

  @Column()
  status!: 'ready' | 'not-ready' | 'disconnected';

  @Column({ nullable: true })
  reason?: string;

  @Column({ nullable: true })
  customReason?: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  changedAt!: Date;
}
