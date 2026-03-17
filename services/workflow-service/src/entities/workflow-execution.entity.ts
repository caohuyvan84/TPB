import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowDefinition } from './workflow-definition.entity';

@Entity('workflow_executions')
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId!: string;

  @ManyToOne(() => WorkflowDefinition)
  @JoinColumn({ name: 'workflow_id' })
  workflow?: WorkflowDefinition;

  @Column()
  status!: string;

  @Column({ name: 'input_data', type: 'jsonb', nullable: true })
  inputData?: object;

  @Column({ name: 'output_data', type: 'jsonb', nullable: true })
  outputData?: object;

  @Column({ name: 'error_message', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'started_at' })
  startedAt!: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
