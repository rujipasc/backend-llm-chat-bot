// src/auth/auth.controller.ts
import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Get,
  Query,
  HttpCode,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RequestMagicDto } from './dto/request-magic.dto';
import { VerifyMagicDto } from './dto/verify-magic.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AccessTokenPayload } from './jwt.strategy';

type AuthedRequest = ExpressRequest & { user: AccessTokenPayload };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('request-magic')
  @HttpCode(201)
  requestMagic(@Body() body: RequestMagicDto) {
    return this.auth.requestMagic(body.email, body.employeeId);
  }

  @Post('verify-magic')
  @HttpCode(200)
  verifyMagic(@Body() body: VerifyMagicDto) {
    return this.auth.verifyMagic(body.token);
  }

  // GET variant to support direct email link: /auth/verify-magic?token=...
  @Get('verify-magic')
  @HttpCode(200)
  verifyMagicGet(@Query('token') token: string) {
    return this.auth.verifyMagic(token);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  logout(@Req() req: AuthedRequest) {
    return this.auth.logout(req.user.sub);
  }
}
