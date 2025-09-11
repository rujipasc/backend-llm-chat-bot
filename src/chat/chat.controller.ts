import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { Request } from 'express';
import type { AccessTokenPayload } from 'src/auth/jwt.strategy';
import { IsString } from 'class-validator';

type AuthedRequest = Request & { user: AccessTokenPayload };

class AskDto {
  @IsString()
  question!: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @UseGuards(JwtAuthGuard)
  @Post('ask')
  @HttpCode(200)
  async ask(@Body() body: AskDto, @Req() req: AuthedRequest) {
    const employeeId = req.user.employeeId;
    const answer = await this.chat.ask(body.question, employeeId);
    return { ok: true, answer };
  }
}
