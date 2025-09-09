import { IsEmail, IsOptional, IsString, IsEnum } from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { PartialType } from '@nestjs/mapped-types';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsString() bu?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() pg?: string;
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-call
export class UpdateUserDto extends PartialType(CreateUserDto) {}
