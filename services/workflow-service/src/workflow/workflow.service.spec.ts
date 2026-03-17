import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowService } from './workflow.service';
import { WorkflowDefinition, WorkflowExecution } from '../entities';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let workflowRepo: Repository<WorkflowDefinition>;
  let executionRepo: Repository<WorkflowExecution>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: getRepositoryToken(WorkflowDefinition),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WorkflowExecution),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WorkflowService);
    workflowRepo = module.get(getRepositoryToken(WorkflowDefinition));
    executionRepo = module.get(getRepositoryToken(WorkflowExecution));
  });

  it('should create workflow', async () => {
    const dto = {
      name: 'Test Workflow',
      trigger: { type: 'event', event: 'ticket.created' },
      steps: [{ type: 'send_notification', config: {} }],
    };
    const workflow = { id: '1', ...dto };
    jest.spyOn(workflowRepo, 'create').mockReturnValue(workflow as any);
    jest.spyOn(workflowRepo, 'save').mockResolvedValue(workflow as any);

    const result = await service.createWorkflow('tenant-1', 'user-1', dto);
    expect(result).toEqual(workflow);
  });

  it('should find all workflows', async () => {
    const workflows = [{ id: '1', name: 'Workflow 1' }];
    jest.spyOn(workflowRepo, 'find').mockResolvedValue(workflows as any);

    const result = await service.findAll('tenant-1');
    expect(result).toEqual(workflows);
  });

  it('should find one workflow', async () => {
    const workflow = { id: '1', name: 'Workflow 1' };
    jest.spyOn(workflowRepo, 'findOne').mockResolvedValue(workflow as any);

    const result = await service.findOne('1', 'tenant-1');
    expect(result).toEqual(workflow);
  });

  it('should update workflow', async () => {
    const workflow = { id: '1', name: 'Updated' };
    jest.spyOn(workflowRepo, 'update').mockResolvedValue({} as any);
    jest.spyOn(workflowRepo, 'findOne').mockResolvedValue(workflow as any);

    const result = await service.updateWorkflow('1', 'tenant-1', { name: 'Updated' });
    expect(result).toEqual(workflow);
  });

  it('should delete workflow', async () => {
    jest.spyOn(workflowRepo, 'delete').mockResolvedValue({} as any);

    await service.deleteWorkflow('1', 'tenant-1');
    expect(workflowRepo.delete).toHaveBeenCalledWith({ id: '1', tenantId: 'tenant-1' });
  });

  it('should activate workflow', async () => {
    const workflow = { id: '1', isActive: true };
    jest.spyOn(workflowRepo, 'update').mockResolvedValue({} as any);
    jest.spyOn(workflowRepo, 'findOne').mockResolvedValue(workflow as any);

    const result = await service.activateWorkflow('1', 'tenant-1');
    expect(result!.isActive).toBe(true);
  });

  it('should trigger workflow', async () => {
    const workflow = { id: '1', isActive: true, steps: [], variables: {} };
    const execution = { id: 'exec-1', status: 'running' };
    jest.spyOn(workflowRepo, 'findOne').mockResolvedValue(workflow as any);
    jest.spyOn(executionRepo, 'create').mockReturnValue(execution as any);
    jest.spyOn(executionRepo, 'save').mockResolvedValue(execution as any);

    const result = await service.triggerWorkflow('1', 'tenant-1', {});
    expect(result.status).toBe('running');
  });

  it('should get executions', async () => {
    const executions = [{ id: 'exec-1', status: 'completed' }];
    jest.spyOn(executionRepo, 'find').mockResolvedValue(executions as any);

    const result = await service.getExecutions('1', 'tenant-1');
    expect(result).toEqual(executions);
  });
});
