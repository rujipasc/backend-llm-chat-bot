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
  Res,
} from '@nestjs/common';
import type { Request as ExpressRequest, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RequestMagicDto } from './dto/request-magic.dto';
import { VerifyMagicDto } from './dto/verify-magic.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AccessTokenPayload } from './jwt.strategy';

type AuthedRequest = ExpressRequest & { user: AccessTokenPayload };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

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
  async verifyMagicGet(@Query('token') token: string, @Res() res: Response) {
    const result = await this.auth.verifyMagic(token);

    // redirect ไป FE
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:4001';

    return res.redirect(
      `${frontendUrl}/magic-callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
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
