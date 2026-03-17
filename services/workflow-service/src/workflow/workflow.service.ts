import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowDefinition, WorkflowExecution } from '../entities';
import { CreateWorkflowDto, UpdateWorkflowDto, TriggerWorkflowDto } from './dto/workflow.dto';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER   = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowDefinition)
    private workflowRepo: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowExecution)
    private executionRepo: Repository<WorkflowExecution>,
  ) {}

  async createWorkflow(tenantId: string, userId: string, dto: CreateWorkflowDto) {
    const workflow = this.workflowRepo.create({
      tenantId,
      createdBy: userId,
      name: dto.name,
      description: dto.description,
      trigger: dto.trigger || {},
      steps: dto.steps || [],
      variables: dto.variables || [],
      errorHandling: dto.errorHandling || {},
    });
    return this.workflowRepo.save(workflow);
  }

  async findAll(tenantId: string) {
    return this.workflowRepo.find({ where: { tenantId } });
  }

  async findOne(id: string, tenantId: string) {
    return this.workflowRepo.findOne({ where: { id, tenantId } });
  }

  async updateWorkflow(id: string, tenantId: string, dto: UpdateWorkflowDto) {
    const workflow = await this.findOne(id, tenantId);
    if (!workflow) throw new NotFoundException('Workflow not found');
    Object.assign(workflow, dto);
    return this.workflowRepo.save(workflow);
  }

  async deleteWorkflow(id: string, tenantId: string) {
    const workflow = await this.findOne(id, tenantId);
    if (!workflow) throw new NotFoundException('Workflow not found');
    await this.workflowRepo.delete({ id, tenantId });
    return { message: 'Workflow deleted' };
  }

  async activateWorkflow(id: string, tenantId: string) {
    const workflow = await this.findOne(id, tenantId);
    if (!workflow) throw new NotFoundException('Workflow not found');
    workflow.isActive = true;
    return this.workflowRepo.save(workflow);
  }

  async deactivateWorkflow(id: string, tenantId: string) {
    const workflow = await this.findOne(id, tenantId);
    if (!workflow) throw new NotFoundException('Workflow not found');
    workflow.isActive = false;
    return this.workflowRepo.save(workflow);
  }

  async triggerWorkflow(id: string, tenantId: string, dto: TriggerWorkflowDto) {
    const workflow = await this.findOne(id, tenantId);
    if (!workflow) throw new NotFoundException('Workflow not found');
    if (!workflow.isActive) throw new NotFoundException('Workflow is not active');

    const execution = this.executionRepo.create({
      workflowId: id,
      status: 'running',
      inputData: dto.eventData || dto.variables || {},
    });

    return this.executionRepo.save(execution);
  }

  async getExecutions(workflowId: string, tenantId: string) {
    return this.executionRepo.find({ where: { workflowId } });
  }

  async getExecution(executionId: string, tenantId: string) {
    return this.executionRepo.findOne({ where: { id: executionId } });
  }
}
