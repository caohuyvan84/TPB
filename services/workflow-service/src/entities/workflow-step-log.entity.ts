import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowExecution } from './workflow-execution.entity';

@Entity('workflow_step_logs')
export class WorkflowStepLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  executionId!: string;

  @ManyToOne(() => WorkflowExecution)
  @JoinColumn({ name: 'execution_id' })
  execution?: WorkflowExecution;

  @Column()
  stepName!: string;

  @Column()
  stepType!: string;

  @Column()
  status!: string;

  @Column('jsonb', { nullable: true })
  input?: object;

  @Column('jsonb', { nullable: true })
  output?: object;

  @Column({ nullable: true })
  error?: string;

  @CreateDateColumn()
  startedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
