import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Dashboard } from './dashboard.entity';

@Entity('dashboard_widgets')
export class DashboardWidget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  dashboardId!: string;

  @ManyToOne(() => Dashboard, dashboard => dashboard.widgets)
  @JoinColumn({ name: 'dashboard_id' })
  dashboard?: Dashboard;

  @Column()
  widgetType!: string;

  @Column()
  title!: string;

  @Column('jsonb')
  config!: object;

  @Column('jsonb')
  position!: object;

  @Column({ default: 30 })
  refreshIntervalSeconds!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
