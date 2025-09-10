import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../auth/jwt.strategy';

type AuthedRequest = Request & { user: AccessTokenPayload };

@Controller('users')
export class UsersController {
  constructor(private readonly user: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthedRequest) {
    const user = await this.user.findOneWithNames(req.user.sub);
    if (!user) throw new NotFoundException('User not found');
    return { ok: true, user };
  }

  @Get()
  findAll() {
    return this.user.findAll();
  }

  @Post()
  create(@Body() body: CreateUserDto) {
    return this.user.create(body);
  }

  @Get(':employeeId')
  async findByEmployeeId(@Param('employeeId') employeeId: string) {
    const user = await this.user.findByEmployeeId(employeeId);
    if (!user) {
      throw new NotFoundException(
        `User with employeeId ${employeeId} not found`,
      );
    }
    return user;
  }

  @Patch(':employeeId')
  async update(
    @Param('employeeId') employeeId: string,
    @Body() body: UpdateUserDto,
  ) {
    const user = await this.user.findByEmployeeId(employeeId);
    if (!user) {
      throw new NotFoundException(
        `User with employeeId ${employeeId} not found`,
      );
    }
    return this.user.update(user.id, body);
  }

  @Delete(':employeeId')
  async removeByEmployee(@Param('employeeId') employeeId: string) {
    const user = await this.user.findByEmployeeId(employeeId);
    if (!user) {
      throw new NotFoundException(
        `User with employeeId ${employeeId} not found`,
      );
    }
    return this.user.remove(user.id);
  }
}
