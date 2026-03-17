import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AgentProfile } from './agent-profile.entity';

@Entity('agent_sessions')
export class AgentSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  agentId!: string;

  @ManyToOne(() => AgentProfile, (profile) => profile.sessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'agentId' })
  agent!: AgentProfile;

  @Column({ type: 'timestamptz' })
  loginAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  logoutAt?: Date;

  @Column({ default: 'connected' })
  connectionStatus!: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  lastHeartbeatAt!: Date;

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
