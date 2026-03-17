import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Report } from './report.entity';

@Entity('report_access_logs')
export class ReportAccessLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  reportId!: string;

  @ManyToOne(() => Report)
  @JoinColumn({ name: 'report_id' })
  report?: Report;

  @Column('uuid')
  userId!: string;

  @CreateDateColumn()
  accessedAt!: Date;
}
