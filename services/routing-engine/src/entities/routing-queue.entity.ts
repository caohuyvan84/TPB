import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('routing_queues')
export class RoutingQueue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  channelType!: string; // voice, chat, email

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'int', default: 30 })
  slaSeconds!: number;

  @Column({ type: 'int', default: 20 })
  maxWaitSeconds!: number;

  @Column({ type: 'jsonb', default: '[]' })
  requiredSkills!: string[]; // skills required for this queue

  @Column({ type: 'varchar', length: 50, nullable: true })
  overflowQueueId!: string | null;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
