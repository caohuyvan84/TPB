import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto, UpdateWorkflowDto, TriggerWorkflowDto } from './dto/workflow.dto';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER   = '00000000-0000-0000-0000-000000000001';

@Controller('workflows')
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @Post()
  createWorkflow(@Body() dto: CreateWorkflowDto, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    const userId = user?.sub || user?.id || DEFAULT_USER;
    return this.workflowService.createWorkflow(tenantId, userId, dto);
  }

  @Get()
  findAll(@Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.workflowService.findAll(tenantId);
  }

  @Get('executions/:executionId')
  getExecution(@Param('executionId') executionId: string, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.workflowService.getExecution(executionId, tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.workflowService.findOne(id, tenantId);
  }

  @Put(':id')
  updateWorkflow(@Param('id') id: string, @Body() dto: UpdateWorkflowDto, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.workflowService.updateWorkflow(id, tenantId, dto);
  }

  @Delete(':id')
  deleteWorkflow(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.workflowService.deleteWorkflow(id, tenantId);
  }

  @Post(':id/activate')
  activateWorkflow(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.workflowService.activateWorkflow(id, tenantId);
  }

  @Post(':id/deactivate')
  deactivateWorkflow(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.workflowService.deactivateWorkflow(id, tenantId);
  }

  @Post(':id/trigger')
  triggerWorkflow(@Param('id') id: string, @Body() dto: TriggerWorkflowDto, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.workflowService.triggerWorkflow(id, tenantId, dto);
  }

  @Get(':id/executions')
  getExecutions(@Param('id') id: string, @Req() req: Request) {
    const user = (req as any).user;
    const tenantId = user?.tenantId || DEFAULT_TENANT;
    return this.workflowService.getExecutions(id, tenantId);
  }
}
