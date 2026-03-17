import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('workflow_definitions')
export class WorkflowDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'is_active', default: false })
  isActive!: boolean;

  @Column({ default: 1 })
  version!: number;

  @Column('jsonb')
  trigger!: object;

  @Column('jsonb')
  steps!: object;

  @Column('jsonb', { default: [] })
  variables!: object;

  @Column({ name: 'error_handling', type: 'jsonb', default: {} })
  errorHandling!: object;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
