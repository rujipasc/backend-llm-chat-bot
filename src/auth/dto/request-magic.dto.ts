import { IsEmail, IsOptional, IsString } from 'class-validator';

export class RequestMagicDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}
