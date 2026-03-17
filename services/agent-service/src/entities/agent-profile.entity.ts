import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { AgentChannelStatus } from './agent-channel-status.entity';
import { AgentSession } from './agent-session.entity';

@Entity('agent_profiles')
export class AgentProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ unique: true })
  @Index()
  agentId!: string;

  @Column()
  displayName!: string;

  @Column({ nullable: true })
  department?: string;

  @Column({ nullable: true })
  team?: string;

  @Column({ type: 'jsonb', default: [] })
  skills!: string[];

  @Column({ default: 3 })
  maxConcurrentChats!: number;

  @Column({ default: 5 })
  maxConcurrentEmails!: number;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @OneToMany(() => AgentChannelStatus, (status) => status.agent)
  channelStatuses!: AgentChannelStatus[];

  @OneToMany(() => AgentSession, (session) => session.agent)
  sessions!: AgentSession[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
