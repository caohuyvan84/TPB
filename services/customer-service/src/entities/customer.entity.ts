import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CustomerNote } from './customer-note.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'tenant_id' })
  @Index()
  tenantId!: string;

  @Column({ unique: true })
  @Index()
  cif!: string;

  @Column({ name: 'full_name' })
  fullName!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  segment?: string;

  @Column({ default: false, name: 'is_vip' })
  isVip!: boolean;

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl?: string;

  @Column({ nullable: true, name: 'satisfaction_rating' })
  satisfactionRating?: number;

  @Column({ type: 'jsonb', default: {}, name: 'dynamic_fields' })
  dynamicFields!: Record<string, any>;

  @OneToMany(() => CustomerNote, (note) => note.customer)
  notes!: CustomerNote[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
