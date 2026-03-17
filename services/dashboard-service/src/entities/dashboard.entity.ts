import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { DashboardWidget } from './dashboard-widget.entity';

@Entity('dashboards')
export class Dashboard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('jsonb')
  layout!: object;

  @Column('text', { array: true, default: [] })
  roleRestrictions!: string[];

  @Column({ default: false })
  isDefault!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column('uuid')
  createdBy!: string;

  @OneToMany(() => DashboardWidget, widget => widget.dashboard)
  widgets?: DashboardWidget[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
