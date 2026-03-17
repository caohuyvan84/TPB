import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  supersetDashboardId?: number;

  @Column({ nullable: true })
  supersetChartId?: number;

  @Column({ nullable: true })
  category?: string;

  @Column('text', { array: true, default: [] })
  roleRestrictions!: string[];

  @Column({ default: true })
  isActive!: boolean;

  @Column('uuid')
  createdBy!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
