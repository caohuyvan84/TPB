import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('routing_rules')
export class RoutingRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  priority!: number; // Higher = evaluated first

  @Column({ type: 'jsonb', default: '{}' })
  conditions!: Record<string, unknown>; // e.g. { channelType: 'voice', ivrSelection: '1' }

  @Column({ type: 'uuid' })
  targetQueueId!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
