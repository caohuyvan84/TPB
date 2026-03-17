import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';

export class UpdateStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['new', 'in-progress', 'resolved', 'completed', 'closed'])
  status!: string;
}

export class AssignAgentDto {
  @IsString()
  @IsNotEmpty()
  agentId!: string;

  @IsString()
  @IsOptional()
  agentName?: string;
}

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsOptional()
  tag?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;
}

export class ListInteractionsDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsOptional()
  assignedAgentId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;
}
