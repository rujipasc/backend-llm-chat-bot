import { IsString } from 'class-validator';

export class VerifyMagicDto {
  @IsString()
  token: string;
}
