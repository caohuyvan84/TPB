import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ai_requests')
export class AIRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column()
  type!: string; // suggest, summarize, sentiment, classify

  @Column({ name: 'input_text', type: 'text' })
  inputText!: string;

  @Column({ name: 'output_text', type: 'text', nullable: true })
  outputText!: string | null;

  @Column({ type: 'text', nullable: true })
  model!: string | null;

  @Column({ name: 'tokens_used', type: 'int', nullable: true })
  tokensUsed!: number | null;

  @Column({ name: 'latency_ms', type: 'int', nullable: true })
  latencyMs!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
