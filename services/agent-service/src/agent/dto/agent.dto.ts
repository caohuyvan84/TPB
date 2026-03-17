import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class SetChannelStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ready', 'not-ready', 'disconnected'])
  status!: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  customReason?: string;
}

export class SetAllChannelsStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ready', 'not-ready', 'disconnected'])
  status!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
