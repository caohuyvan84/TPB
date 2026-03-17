import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('channel_configs')
export class ChannelConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  channelType!: string; // voice, email, chat, sms, social

  @Column({ type: 'varchar', length: 100 })
  adapterClass!: string; // e.g. 'FreeSwitchAdapter', 'EmailAdapter'

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  config!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
