import { IsString, IsOptional, IsObject, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  trigger?: object;

  @IsOptional()
  steps?: object;

  @IsOptional()
  variables?: object;

  @IsOptional()
  errorHandling?: object;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  trigger?: object;

  @IsOptional()
  steps?: object;

  @IsOptional()
  variables?: object;

  @IsOptional()
  errorHandling?: object;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class TriggerWorkflowDto {
  @IsOptional()
  eventData?: object;

  @IsOptional()
  variables?: object;
}

export class WorkflowExecutionDto {
  id!: string;
  workflowId!: string;
  status!: string;
  startedAt!: Date;
  completedAt?: Date;
  error?: string;
}
