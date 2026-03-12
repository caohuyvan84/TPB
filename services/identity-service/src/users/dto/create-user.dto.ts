import { IsEmail, IsString, IsNotEmpty, MinLength, IsArray, IsOptional, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsArray()
  @IsString({ each: true })
  roles!: string[];

  @IsUUID()
  @IsOptional()
  tenantId?: string;
}
